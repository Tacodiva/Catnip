import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { IR0Pass, IRType } from "../../IRPass";
import { IR0InputDataVariableGet } from "../data/IR0InputDataVariableGet";
import { IR0CmdDataVariableSet } from "../data/IR0CmdDataVariableSet";
import { IR0 } from "../IR0";
import { IR0BasicBlock } from "../IR0BasicBlock";
import { IR0ControlFlowType } from "../IR0ControlFlow";
import { IR0Input, IR0Node } from "../IR0Node";
import { IR0Script } from "../IR0Script";
import { IR0TriggerProcedure } from "../procedure/IR0TriggerProcedure";

export const IR0PassVariableAnalysis: IR0Pass = {
    type: IRType.IR0,
    priority: 0,

    execute: function (ir: IR0): boolean {

        // We're gonna need this later
        const callGraph = ir.createCallGraph();

        function isProcedure(script: IR0Script) {
            return script.trigger instanceof IR0TriggerProcedure;
        }

        class VariableState {
            public readonly variables: Map<CatnipVariable, CatnipValue>;

            public constructor(variables: Map<CatnipVariable, CatnipValue>) {
                this.variables = variables;
            }

            public or(other: VariableState): boolean {
                // Every instance of VariableState should have every variable in it
                CatnipCompilerLogger.assert(this.variables.size === other.variables.size);

                let modified = false;

                for (const [variable, otherValue] of other.variables) {
                    const thisValue = this.variables.get(variable);
                    CatnipCompilerLogger.assert(thisValue !== undefined);

                    if (!otherValue.isSubsetOf(thisValue)) {
                        modified = true;
                        this.variables.set(variable, thisValue.or(otherValue));
                    }
                }

                return modified;
            }

            public set(variable: CatnipVariable, value: CatnipValue) {
                // Variables must all be F64s
                CatnipCompilerLogger.assert(value.isAlwaysFormat(CatnipValueFormat.F64));

                this.variables.set(variable, value);
            }

            public get(variable: CatnipVariable): CatnipValue {
                return this.variables.get(variable)!;
            }

            public clone(): VariableState {
                return new VariableState(new Map(this.variables));
            }
        }

        // The variable state will start off with all the variables being constants (the value they are
        //   initially set to)
        // We create that state here :3
        const initialVariableStateMap: Map<CatnipVariable, CatnipValue> = new Map();
        for (const sprite of ir.compiler.project.sprites) {
            for (const variable of sprite.variables) {
                const initialValue = sprite.defaultTarget.getVariableValue(variable.id);
                let initialFormat: CatnipValueFormat;

                if (typeof initialValue === "number") {
                    initialFormat = CatnipValueFormatUtils.getNumberFormat(initialValue);
                } else {
                    initialFormat = CatnipValueFormat.F64_BOXED_I32_HSTRING;
                }

                initialVariableStateMap.set(variable, CatnipValue.constant(initialValue, initialFormat));
            }
        }
        const initialVariableState = new VariableState(initialVariableStateMap);

        interface BasicBlockInfo {
            block: IR0BasicBlock,
            // We keep track of the state of all the variables as we enter each block, if this state ever gets
            //   updated it means we need to re-analyze the block. It will then be added to 'blocksToAnalze'.
            entryState: VariableState;

            // True if this block is already queued to be analyzed.
            isQueuedForAnalysis: boolean;
        }

        // We need to create a list of blocks that can be yielded to.
        // Each time we update the global yield state, we need to update all of these block's entry state.
        const yieldedBlocks: Set<IR0BasicBlock> = new Set();

        // All the blocks that are entrypoints for the project are set as yielded blocks because they need to
        // be updated with the global state too.
        for (const script of ir.scripts) {
            // Procedures entry state is not decided by us
            if (!isProcedure(script))
                yieldedBlocks.add(script.head);
        }

        // We need to add all the other blocks we yield to to the list.
        ir.forEachBasicBlock(block => {
            if (block.flow.type !== IR0ControlFlowType.Next) return;

            if (block.flow.status !== CatnipWasmEnumThreadStatus.RUNNING) {
                // This is a yield, add the target to the list of yielded to blocks
                yieldedBlocks.add(block.flow.next);
            }
        });

        let anyModified = false;
        let lastModified = true;

        // We do multiple passes of this until we stop changing anything.
        while (lastModified) {

            const blockMap: Map<IR0BasicBlock, BasicBlockInfo> = new Map();

            // A list of blocks we need to analyze
            const blocksToAnalyze: BasicBlockInfo[] = [];

            function updateBlockState(block: IR0BasicBlock, state: VariableState) {
                let blockInfo = blockMap.get(block);

                if (blockInfo === undefined) {
                    blockMap.set(block, blockInfo = {
                        block,
                        entryState: state.clone(),
                        isQueuedForAnalysis: true
                    });

                    blocksToAnalyze.push(blockInfo);

                    return;
                }

                const modified = blockInfo.entryState.or(state);

                if (modified && !blockInfo.isQueuedForAnalysis) {
                    blockInfo.isQueuedForAnalysis = true;
                    blocksToAnalyze.push(blockInfo);
                }
            }
            // When a block is yielded to, this is the state it will enter with.
            // This is the same for all blocks we can yield to.
            let yieldVariableState: VariableState | null = null;

            function updateYieldState(state: VariableState) {
                if (yieldVariableState === null) {
                    yieldVariableState = state.clone();
                } else {
                    // If nothing changes, we don't want to reanalyze everything
                    if (!yieldVariableState.or(state))
                        return;
                }

                // Update all the blocks that are yielded
                for (const yieldedBlock of yieldedBlocks)
                    updateBlockState(yieldedBlock, yieldVariableState);
            }

            // All the blocks that are entrypoints have the state set to the initial variable state.
            // This will also enqueue them all to be analyzed. 
            for (const script of ir.scripts) {
                if (!isProcedure(script))
                    updateBlockState(script.head, initialVariableState);
            }

            // A map of all the gets to the value they get.
            const variableGets: Map<IR0InputDataVariableGet, CatnipValue> = new Map();

            // Now we get started with the main loop, we keep analyzing till there's nothing left to analyze.
            while (blocksToAnalyze.length !== 0) {

                const blockInfo = blocksToAnalyze.pop()!;
                blockInfo.isQueuedForAnalysis = false;

                {
                    const state = blockInfo.entryState.clone();

                    function checkInput(input: IR0Input) {
                        checkNode(input);

                        if (input instanceof IR0InputDataVariableGet) {
                            variableGets.set(input, state.get(input.variable));
                        }
                    }

                    function checkNode(node: IR0Node) {
                        for (const arg of Object.values(node.args))
                            checkInput(arg.input);
                    }

                    blockInfo.block.forEachRootNode(
                        command => {
                            checkNode(command);

                            if (command instanceof IR0CmdDataVariableSet) {
                                // Set the variable :3
                                state.set(command.variable, command.args.value.getResult());
                            }
                        },
                        inputRef => {
                            checkInput(inputRef.input);
                        }
                    );

                    const flow = blockInfo.block.flow;

                    switch (flow.type) {
                        case IR0ControlFlowType.Next:
                            if (flow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                                updateBlockState(flow.next, state);
                            } else {
                                updateYieldState(state);
                            }
                            break;
                        case IR0ControlFlowType.Condition:
                            updateBlockState(flow.pass, state);
                            updateBlockState(flow.fail, state);
                            break;
                        case IR0ControlFlowType.Call:
                            updateBlockState(flow.procedure.head, state);
                            break;

                        case IR0ControlFlowType.Return: {

                            const script = blockInfo.block.script;

                            if (!isProcedure(script)) {
                                // If it's not procedure, then returning will return control to the VM,
                                //   thus we need to update the yield state
                                updateYieldState(state);
                            }

                            const scriptNode = callGraph.get(script);

                            if (scriptNode !== undefined) {
                                for (const { returnBlock } of scriptNode.callers) {
                                    updateBlockState(returnBlock, state);
                                }
                            }

                            break;
                        }
                    }
                }
            }

            // We've finished analyzing, now we have to check if we discovered anything new
            lastModified = false;

            for (const [get, value] of variableGets) {
                if (!get.result.equals(value)) {
                    get.result = value;
                    lastModified = true;
                }
            }

            if (lastModified) anyModified = true;
        }

        return anyModified;
    }
}