import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { IR1 } from "../ir1/IR1";
import { IR1Script } from "../ir1/IR1Script";
import { IR1ExternalValueSourceType, IR1Function } from "../ir1/IR1Function";
import { IR1ExternalValue, IR1ExternalValueType } from "../ir1/IR1ExternalValue";
import { IR1Logger } from "../ir1/IR1Logger";
import { IR0 } from "./IR0";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0Script } from "./IR0Script";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0InputProcedureArgument } from "./procedure/IR0InputProcedureArgument";
import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";

// Holds additional info we need about each basic block for translating it to IR1
export interface BasicBlockInfo {
    block: IR0BasicBlock;
    func: FunctionInfo;

    isEntrypoint: boolean;
    isMerge: boolean;
    isLoopHead: boolean;

    // These arrays do not include blocks called with the `call` flow type, so these are isolated to a single script
    in: BasicBlockInfo[];
    out: BasicBlockInfo[];

    immediateDominator: BasicBlockInfo | null;
    immediateDominates: BasicBlockInfo[];

    reversePostorderIndex: number;
};

export interface FunctionInfo {
    script: ScriptInfo;

    ir0: IR0BasicBlock;
    ir1: IR1Function;

    isYieldTarget: boolean;
}

// Holds additional info we need about each script for translating it to IR1
export interface ScriptInfo {
    ir0: IR0Script;
    ir1: IR1Script;

    blocks: BasicBlockInfo[];
    functions: FunctionInfo[];
    entrypoint: FunctionInfo;

    isYielding: boolean;
}

export class IR0ToIR1Info {

    public readonly ir0: IR0;
    public readonly ir1: IR1;

    private _scripts: Map<IR0Script, ScriptInfo>;
    private _functions: Map<IR0BasicBlock, FunctionInfo>;
    private _blocks: Map<IR0BasicBlock, BasicBlockInfo>;

    public constructor(ir0: IR0, ir1: IR1) {
        this.ir0 = ir0;
        this.ir1 = ir1;
        this._scripts = new Map();
        this._functions = new Map();
        this._blocks = new Map();
    }

    public create() {

        // Create ScriptInfo for each script
        for (const ir0Script of this.ir0.scripts) {
            const ir1Script = new IR1Script(
                this.ir1, ir0Script.trigger.toIR1(), ir0Script.spriteID
            );

            this._scripts.set(ir0Script, {
                ir0: ir0Script,
                ir1: ir1Script,
                blocks: [],
                functions: [],

                // Set below
                entrypoint: null!,

                isYielding: false
            });
        }

        // Figure out which scripts are yielding, this is needed for figuring out what the functions are.
        {
            const checkingScripts: Set<IR0Script> = new Set();
            const checkedScripts: Set<IR0Script> = new Set();
            const isScriptYielding = (script: IR0Script): boolean => {

                if (checkingScripts.has(script)) {
                    // Recursion. Recursion yields
                    return true;
                }

                if (checkedScripts.has(script)) {
                    return this.getScriptInfo(script).isYielding;
                }

                checkingScripts.add(script);

                let isYielding = false;

                script.forEachBasicBlock(block => {
                    const flow = block.flow;
                    switch (flow.type) {
                        case IR0ControlFlowType.Next:
                            if (flow.status !== CatnipWasmEnumThreadStatus.RUNNING)
                                isYielding = true;
                            break;
                        case IR0ControlFlowType.Call:
                            if (isScriptYielding(flow.procedure))
                                isYielding = true;
                            break;
                    }
                });

                checkingScripts.delete(script);
                checkedScripts.add(script);

                this.getScriptInfo(script).isYielding = isYielding;

                return isYielding;
            };

            for (const ir0Script of this.ir0.scripts) {
                isScriptYielding(ir0Script);
            }
        }

        for (const script of this._scripts.values()) {

            const createFunction = (block: IR0BasicBlock, isYieldTarget: boolean, func?: IR1Function): FunctionInfo => {
                let functionInfo = this._functions.get(block);

                if (functionInfo === undefined) {
                    functionInfo = {
                        script,
                        isYieldTarget,
                        ir0: block,
                        ir1: func ?? new IR1Function(script.ir1),
                    };

                    this._functions.set(block, functionInfo);
                    script.functions.push(functionInfo);
                }

                if (isYieldTarget) {
                    functionInfo.isYieldTarget = true;
                    // This function is a yield target, so its external values must be sourced from the stack.
                    functionInfo.ir1.externalValueSource = IR1ExternalValueSourceType.STACK;
                }

                CatnipCompilerLogger.assert(functionInfo.ir0 === block);

                return functionInfo;
            }

            // The head will always be a function
            script.entrypoint = createFunction(script.ir0.head, false, script.ir1.entrypoint);

            // Figure out which basic blocks must be function heads
            script.ir0.forEachBasicBlock(block => {
                switch (block.flow.type) {
                    case IR0ControlFlowType.Next:
                        if (block.flow.status !== CatnipWasmEnumThreadStatus.RUNNING) {
                            // This is a yield, so the target block has to be a function
                            createFunction(block.flow.next, true);
                        }
                        break;
                    case IR0ControlFlowType.Call: {
                        const calledProcedureInfo = this.getScriptInfo(block.flow.procedure);

                        if (calledProcedureInfo.isYielding) {
                            createFunction(block.flow.next, true);
                        }
                        break;
                    }
                }
            });

            // Create BasicBlockInfo for every basic block, while also linking up in and out blocks
            //   Add the basic block info to the global map and also the function's list of blocks
            {
                const visitBlock = (block: IR0BasicBlock, func: FunctionInfo) => {

                    let blockInfo = this._blocks.get(block);
                    if (blockInfo !== undefined) return blockInfo;

                    let blockFunc = this._functions.get(block);
                    if (blockFunc === undefined)
                        blockFunc = func;

                    blockInfo = {
                        block,
                        func: blockFunc,

                        isEntrypoint: false,
                        isMerge: false,
                        isLoopHead: false,

                        out: [],
                        in: [],

                        immediateDominator: null,
                        immediateDominates: [],

                        reversePostorderIndex: -1,
                    };

                    this._blocks.set(block, blockInfo);
                    script.blocks.push(blockInfo);

                    function addEdge(src: BasicBlockInfo, dest: BasicBlockInfo) {
                        src.out.push(dest);
                        dest.in.push(src);
                    }

                    switch (block.flow.type) {
                        case IR0ControlFlowType.Next:
                            addEdge(blockInfo, visitBlock(block.flow.next, blockInfo.func));
                            break;
                        case IR0ControlFlowType.Condition:
                            addEdge(blockInfo, visitBlock(block.flow.pass, blockInfo.func));
                            addEdge(blockInfo, visitBlock(block.flow.fail, blockInfo.func));
                            break;
                        case IR0ControlFlowType.Call:
                            addEdge(blockInfo, visitBlock(block.flow.next, blockInfo.func));
                            break;
                    }

                    return blockInfo;
                };

                visitBlock(script.ir0.head, script.entrypoint);
            }

            // We need to look for any blocks who are being called into from multiple functions
            //   Those blocks need to become their own functions if their not already.
            {
                const convertDecendants = (info: BasicBlockInfo) => {
                    for (const child of info.out) {
                        if (child.func === info.func) continue;
                        if (this._functions.has(child.block)) continue;

                        child.func = info.func;
                        convertDecendants(child);
                    }
                }

                const checkBlock = (info: BasicBlockInfo) => {
                    if (this._functions.has(info.block)) {
                        info.isEntrypoint = true;
                        return;
                    }

                    let func: FunctionInfo = info.in[0].func;

                    for (let i = 1; i < info.in.length; i++) {
                        if (func !== info.in[i].func) {
                            // We found one. We need to make this basic block into its own function
                            func = createFunction(info.block, false);

                            this._functions.set(info.block, func);
                            info.isEntrypoint = true;
                            break;
                        }
                    }

                    if (func !== info.func) {
                        // We've changed this block's function, we need to convert all of our decendants too
                        info.func = func;
                        convertDecendants(info);
                    }
                }

                // Check all the blocks in a breadth first search
                const queue: BasicBlockInfo[] = [this.getBasicBlockInfo(script.entrypoint.ir0)];
                const visited: Set<BasicBlockInfo> = new Set();

                while (queue.length !== 0) {
                    const block = queue.pop()!;
                    checkBlock(block);

                    for (const next of block.out) {
                        if (visited.has(next)) continue;
                        visited.add(next);
                        queue.push(next);
                    }
                }
            }

            // Now we've figured out what blocks are in what functions, we can get to work.
            // In this pass we:
            //  - Assign a reverse postorder index to each block.
            //  - Figure out which blocks are merges and which are loop heads.
            //  - Add each block's created transients to its corresponding function.
            //  - Create the dominator tree for each function.
            for (const func of script.functions) {
                const entrypoint = this.getBasicBlockInfo(func.ir0);

                IR1Logger.assert(entrypoint.isEntrypoint);
                IR1Logger.assert(entrypoint.func === func);

                // We are going to create the reverse post order array and set the index on each block.
                let reversePostorder: BasicBlockInfo[];

                {
                    const postorder: BasicBlockInfo[] = [];
                    const visited: Set<BasicBlockInfo> = new Set();

                    function enumerateBlocks(block: BasicBlockInfo) {
                        if (visited.has(block)) return;
                        visited.add(block);

                        for (const out of block.out) {
                            if (out.func === block.func)
                                enumerateBlocks(out);
                        }

                        postorder.push(block);
                    }

                    enumerateBlocks(entrypoint);

                    reversePostorder = postorder.reverse();

                    for (let i = 0; i < postorder.length; i++)
                        postorder[i].reversePostorderIndex = i;
                }

                IR1Logger.assert(reversePostorder[0] === entrypoint);

                // Now we've got the reverse postorder index, we can cateogrize each block in the function and
                //   add the created transients
                for (const block of reversePostorder) {
                    IR1Logger.assert(!block.isLoopHead);
                    IR1Logger.assert(!block.isMerge);

                    let foundForwardEdge = false;

                    for (const inBlock of block.in) {

                        if (inBlock.func !== block.func)
                            continue;

                        if (inBlock.reversePostorderIndex >= block.reversePostorderIndex) {
                            // This is a backedge
                            block.isLoopHead = true;
                            continue;
                        }

                        if (foundForwardEdge) {
                            // Already found a forward edge, so this node has multiple forward edges
                            //   and is thus a merge node.
                            block.isMerge = true;
                            continue;
                        }

                        foundForwardEdge = true;
                    }

                    // Add the created transients
                    block.func.ir1.createdTransients.push(...block.block.createdTransients);
                }

                // Figure out the dominator tree. Code and comments below stolen from
                // https://github.com/WebAssembly/binaryen/blob/df6d943a3b2a33eb7f09c7b4db002f9d505601ff/src/cfg/domtree.h#L58
                {
                    // We temporarily set the immediate dominator of the entrypoint to itself because
                    //  that's what the below algorithm expects. TODO Get rid of this
                    entrypoint.immediateDominator = entrypoint;

                    // Process the (non-entry) blocks in reverse postorder, computing the
                    // immediate dominators as we go. This returns whether we made any changes,
                    // which is used in an assertion later down.
                    function processBlocks(): boolean {
                        let changed = false;

                        for (let i = 1; i < reversePostorder.length; i++) {

                            const block = reversePostorder[i];
                            IR1Logger.assert(!block.isEntrypoint);

                            let newParent: BasicBlockInfo | null = null;

                            for (const pred of block.in) {
                                IR1Logger.assert(pred.func === func, true, "In-block from a different function in the middle of a function?");

                                // In a reducible graph, we only need to care about the predecessors
                                // that appear before us in the reverse postorder numbering. The only
                                // predecessor that can appear *after* us is a loop backedge, but that
                                // will never dominate the loop - the loop is dominated by its single
                                // entry (since it is reducible, it has just one entry).
                                if (block.reversePostorderIndex > i)
                                    continue;

                                // All of our predecessors will have been processed before us, except
                                // if they are unreachable from the entry, in which case, we can ignore
                                // them.
                                // TODO This should probably never happen here.
                                if (pred.immediateDominator === null)
                                    continue;

                                if (newParent === null) {
                                    // This is the first processed predecessor.
                                    newParent = pred;
                                    continue;
                                }

                                // This is an additional predecessor. Intersect it, by going back to a
                                // node that definitely dominates both possibilities. Effectively, we
                                // keep decreasing the index backwards in the reverse postorder
                                // indexing until we stop (at the latest, in the entry).
                                let left: BasicBlockInfo = newParent;
                                let right = pred;
                                while (left !== right) {
                                    while (left.reversePostorderIndex > right.reversePostorderIndex) {
                                        left = left.immediateDominator!;
                                    }
                                    while (right.reversePostorderIndex > left.reversePostorderIndex) {
                                        right = right.immediateDominator!;
                                    }
                                }

                                newParent = left;
                            }

                            // Check if we found a new value here, and apply it. (We will normally
                            // always find a new value in the single pass that we run, but we also
                            // assert lower down that running another pass causes no further changes.)
                            if (newParent !== block.immediateDominator) {
                                block.immediateDominator = newParent;
                                changed = true;

                                // In reverse postorder the dominator cannot appear later.
                                IR1Logger.assert(newParent!.reversePostorderIndex <= block.reversePostorderIndex);
                            }
                        }

                        return changed;
                    }

                    processBlocks();

                    // We must have finished all the work in a single traversal, since our input
                    // should be reducible.
                    IR1Logger.assert(!processBlocks(), true, "Non-reducable input :c");

                    entrypoint.immediateDominator = null;

                }

                // Create the backward links in the dominator tree
                for (let i = 1; i < reversePostorder.length; i++) {
                    const dominator = reversePostorder[i].immediateDominator;

                    IR1Logger.assert(dominator !== null);

                    dominator.immediateDominates.push(reversePostorder[i]);
                }
            }
        }

        // Okay so we've figured out every IR1 function we're going emit
        // Now we need to figure out what the inputs to each of these functions is going to be
        {
            const sourceExternalValue = (block: BasicBlockInfo, value: IR1ExternalValue): void => {

                // Firstly, check to see if this function already sources this value
                for (const existingExtern of block.func.ir1.externalValues) {
                    // If we already source this external value, bail
                    if (IR1ExternalValue.areEquivalent(existingExtern, value))
                        return;
                }

                if (value.type === IR1ExternalValueType.TRANSIENT_VARIABLE) {
                    // We only need to source the transient if it has not already been created in this function.
                    // If it has been created, then the block which creates it must dominate this block, so we can
                    //   just check the blocks in the dominator tree to look for the creation.

                    let dominatorInfo: BasicBlockInfo | null = block;

                    while (dominatorInfo !== null) {
                        if (dominatorInfo.block.createdTransients.indexOf(value.var) !== -1) {
                            // If a dominator has created the transient, we don't need to source it.
                            return;
                        }

                        dominatorInfo = dominatorInfo.immediateDominator;
                    }

                    // Otherwise, we need to source the value. Because each transient should be limited to a single
                    //   script, we can check here that we are not trying to source the transient from the script's entrypoint.
                    if (block.func === block.func.script.entrypoint) {
                        // We are trying to source the transient from the script's entrypoint :c
                        // This means that we tried to use the transient without creating it first.
                        throw new Error(`Invalid usage of transient '${value.var.name}'. Transient was not created before use.`);
                    }
                }

                // The function doesn't source the value. Let's add it
                block.func.ir1.addExternalValue(value);

                // Whoever calls us from within this script also needs to be able to source the external value.
                for (const inBlock of this.getBasicBlockInfo(block.func.ir0).in) {
                    sourceExternalValue(inBlock, value);
                }
            };

            for (const blockInfo of this._blocks.values()) {
                blockInfo.block.forEachNode(node => {
                    for (const externalValue of node.getExternalValues())
                        sourceExternalValue(blockInfo, externalValue);
                });

                // We need an explicit return location if the script is not top level, and the script is yielding.
                //   If the script is top level, `Return` just terminates the thread.
                //   If the script is not yielding, WASM deals with the return location for us.
                const needsReturnLocation = !blockInfo.func.script.ir1.trigger.isTopLevel && blockInfo.func.script.isYielding;

                if (needsReturnLocation && blockInfo.block.flow.type === IR0ControlFlowType.Return) {
                    sourceExternalValue(blockInfo, { type: IR1ExternalValueType.RETURN_LOCATION });
                }
            }
        }

    }

    public addGraphVisDominanceEdges(generator: IR0GraphVisDotGenerator) {
        for (const script of this._scripts.values()) {
            generator.writeLine(`subgraph cluster_${generator.getScriptInfo(script.ir0).clusterName} {`);
            generator.incrementIndentation();

            for (const blockInfo of script.blocks.values()) {

                if (blockInfo.isLoopHead || blockInfo.isMerge) {

                    let label: string;
                    if (blockInfo.isLoopHead) {
                        if (blockInfo.isMerge) label = "Loop & Merge";
                        else label = "Loop";
                    } else label = "Merge";

                    generator.writeLine(`subgraph cluster_${generator.blocks.get(blockInfo.block)!.clusterName} { label="${label}"; }`);
                }

                if (blockInfo.immediateDominator === null) {
                    IR1Logger.assert(blockInfo.isEntrypoint);
                    generator.writeLine(`subgraph cluster_${generator.blocks.get(blockInfo.block)!.clusterName} { color=blue; }`);
                    continue;
                }

                const blockGraphInfo = generator.blocks.get(blockInfo.block)!;

                // Dominator edges
                // const dominatorGraphInfo = generator.blocks.get(blockInfo.immediateDominator.block)!;
                // generator.writeEdge(dominatorGraphInfo.finalNode, blockGraphInfo.firstNode, `color=black lhead="cluster_${blockGraphInfo.clusterName}" ltail="cluster_${dominatorGraphInfo.clusterName}"`);

                // Function ownership edges
                // const funcEntrypointGraphInfo = generator.blocks.get([...this.functions].find(([block, func]) => func === blockInfo.func)![0])!;
                // generator.writeEdge(blockGraphInfo.firstNode, funcEntrypointGraphInfo.firstNode, `color=red lhead="cluster_${funcEntrypointGraphInfo.clusterName}" ltail="cluster_${blockGraphInfo.clusterName}"`);
            }

            generator.decrementIndentation();
            generator.writeLine(`}`);
        }
    }

    private getRequired<K, V>(map: Map<K, V>, key: K): V {
        const value = map.get(key);
        CatnipCompilerLogger.assert(value !== undefined);
        return value;
    }

    public getScriptInfo(script: IR0Script): ScriptInfo {
        return this.getRequired(this._scripts, script);
    }

    public getBasicBlockInfo(block: IR0BasicBlock): BasicBlockInfo {
        return this.getRequired(this._blocks, block);
    }

    public getFunctionInfo(entrypoint: IR0BasicBlock): FunctionInfo {
        return this.getRequired(this._functions, entrypoint);
    }


}