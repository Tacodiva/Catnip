import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipCompilerTransientVariable } from "../../CatnipCompilerTransientVariable";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { IR0Pass, IRType } from "../../IRPass";
import { IR0CmdTransientSet } from "../core/IR0CmdTransientSet";
import { IR0InputTransientGet } from "../core/IR0InputTransientGet";
import { IR0CmdDataVariableSet } from "../data/IR0CmdDataVariableSet";
import { IR0InputDataVariableGet } from "../data/IR0InputDataVariableGet";
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

        class TransientState {
            public readonly transients: Map<CatnipCompilerTransientVariable, CatnipValue>;

            public constructor(transients?: Map<CatnipCompilerTransientVariable, CatnipValue>) {
                this.transients = transients ?? new Map();
            }

            public create(transient: CatnipCompilerTransientVariable): void {
                CatnipCompilerLogger.assert(!this.transients.has(transient));
                this.transients.set(transient, CatnipValue.none());
            }

            public destroy(transient: CatnipCompilerTransientVariable): void {
                CatnipCompilerLogger.assert(this.transients.has(transient));
                this.transients.delete(transient);
            }

            public get(transient: CatnipCompilerTransientVariable): CatnipValue {
                const value = this.transients.get(transient);
                CatnipCompilerLogger.assert(value !== undefined);
                return value;
            }

            public set(transient: CatnipCompilerTransientVariable, value: CatnipValue): void {
                CatnipCompilerLogger.assert(this.transients.has(transient));
                CatnipCompilerLogger.assert(value.isAlwaysFormat(transient.format));
                this.transients.set(transient, value);
            }

            public or(other: TransientState): boolean {
                // Both options should have the same set of transient variables defined.
                CatnipCompilerLogger.assert(this.transients.size === other.transients.size);

                let modified = false;

                for (const [transient, otherValue] of other.transients) {
                    const thisValue = this.transients.get(transient);
                    CatnipCompilerLogger.assert(thisValue !== undefined);

                    if (!otherValue.isSubsetOf(thisValue)) {
                        modified = true;
                        this.transients.set(transient, thisValue.or(otherValue));
                    }
                }

                return modified;
            }

            public get isEmpty(): boolean { return this.transients.size === 0; }

            public clone(): TransientState {
                return new TransientState(new Map(this.transients));
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
            // We keep track of the state as we enter each block, if this state ever gets
            //   updated it means we need to re-analyze the block. If it has both types of state,
            //   it will then be added to 'blocksToAnalze'.
            entryVariableState: VariableState | null;
            entryTransientState: TransientState | null;

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

            // A list of blocks we need to analyze. All queued blocks should have entryVariableState and entryTransientState set.
            const blocksToAnalyze: BasicBlockInfo[] = [];

            function updateBlockState(block: IR0BasicBlock, variableState: VariableState | null, transientState: TransientState | null) {
                let blockInfo = blockMap.get(block);
                let modified = false;

                if (blockInfo === undefined) {
                    blockMap.set(block, blockInfo = {
                        block,
                        entryVariableState: variableState?.clone() ?? null,
                        entryTransientState: transientState?.clone() ?? null,
                        isQueuedForAnalysis: false
                    });

                    modified = true;
                } else {
                    if (variableState !== null) {
                        if (blockInfo.entryVariableState === null) {
                            modified = true;
                            blockInfo.entryVariableState = variableState.clone();
                        } else {
                            modified = blockInfo.entryVariableState.or(variableState) || modified;
                        }
                    }

                    if (transientState !== null) {
                        if (blockInfo.entryTransientState === null) {
                            modified = true;
                            blockInfo.entryTransientState = transientState.clone();
                        } else {
                            modified = blockInfo.entryTransientState.or(transientState) || modified;
                        }
                    }
                }

                if (modified && !blockInfo.isQueuedForAnalysis) {
                    if (blockInfo.entryVariableState !== null && blockInfo.entryTransientState !== null) {
                        // Only queue the block if we know about the state going into it.
                        blockInfo.isQueuedForAnalysis = true;
                        blocksToAnalyze.push(blockInfo);
                    }
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
                    updateBlockState(yieldedBlock, yieldVariableState, null);
            }

            // All the blocks that are entrypoints have the state set to the initial variable state.
            // This will also enqueue them all to be analyzed. 
            for (const script of ir.scripts) {
                if (isProcedure(script)) {
                    // We don't yet know about the state of variables going into procedures, but we do know they should have no transients
                    updateBlockState(script.head, null, new TransientState());
                } else {
                    updateBlockState(script.head, initialVariableState, new TransientState());
                }
            }

            // A map of all the variable and transient gets to the value they get.
            const gets: Map<IR0InputDataVariableGet | IR0InputTransientGet, CatnipValue> = new Map();

            // Now we get started with the main loop, we keep analyzing till there's nothing left to analyze.
            while (blocksToAnalyze.length !== 0) {

                const blockInfo = blocksToAnalyze.pop()!;
                blockInfo.isQueuedForAnalysis = false;

                // Variable and transient state should be set on all queued blocks.
                CatnipCompilerLogger.assert(blockInfo.entryVariableState !== null);
                CatnipCompilerLogger.assert(blockInfo.entryTransientState !== null);

                {
                    const variableState = blockInfo.entryVariableState.clone();
                    const transientState = blockInfo.entryTransientState.clone();

                    for (const transient of blockInfo.block.createdTransients)
                        transientState.create(transient);

                    function checkInput(input: IR0Input) {
                        checkNode(input);

                        if (input instanceof IR0InputDataVariableGet)
                            gets.set(input, variableState.get(input.variable));

                        if (input instanceof IR0InputTransientGet)
                            gets.set(input, transientState.get(input.transient));
                    }

                    function checkNode(node: IR0Node) {
                        for (const arg of Object.values(node.args))
                            checkInput(arg.input);
                    }

                    blockInfo.block.forEachRootNode(
                        command => {
                            checkNode(command);

                            if (command instanceof IR0CmdDataVariableSet)
                                variableState.set(command.variable, command.args.value.getResult());

                            if (command instanceof IR0CmdTransientSet)
                                transientState.set(command.transient, command.args.value.getResult());
                        },
                        inputRef => {
                            checkInput(inputRef.input);
                        }
                    );

                    for (const transient of blockInfo.block.destroyedTransients) {
                        transientState.destroy(transient);
                    }

                    const flow = blockInfo.block.flow;

                    switch (flow.type) {
                        case IR0ControlFlowType.Next:
                            if (flow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                                updateBlockState(flow.next, variableState, transientState);
                            } else {
                                updateYieldState(variableState); // This will update flow.next with the latest variable state
                                updateBlockState(flow.next, null, transientState); // So we just need to update the transients
                            }
                            break;
                        case IR0ControlFlowType.Condition:
                            updateBlockState(flow.pass, variableState, transientState);
                            updateBlockState(flow.fail, variableState, transientState);
                            break;
                        case IR0ControlFlowType.Call:
                            // When we call a different script, we transfer the variable state but not the transients
                            updateBlockState(flow.procedure.head, variableState, null);
                            // We transfer our transients to the return block
                            updateBlockState(flow.next, null, transientState);
                            break;

                        case IR0ControlFlowType.Return: {

                            // We're returning, all transients should have been destroyed
                            // If this assertion is failing it means we didn't destroy a transient variable somewhere
                            CatnipCompilerLogger.assert(transientState.isEmpty);

                            const script = blockInfo.block.script;

                            if (!isProcedure(script)) {
                                // If it's not a procedure, then returning will return control to the VM,
                                //   thus we need to update the yield state
                                updateYieldState(variableState);
                            }

                            const scriptNode = callGraph.get(script);

                            if (scriptNode !== undefined) {
                                for (const { returnBlock } of scriptNode.callers) {
                                    updateBlockState(returnBlock, variableState, null);
                                }
                            }

                            break;
                        }
                    }
                }
            }

            // We've finished analyzing, now we have to check if we discovered anything new
            lastModified = false;

            for (const [get, value] of gets) {
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