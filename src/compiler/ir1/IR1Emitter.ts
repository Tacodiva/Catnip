import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0GraphVisDotGenerator, IR0Script } from "../ir0/IR0";
import { IR0BasicBlock } from "../ir0/IR0BasicBlock";
import { IR0ControlFlowType, IR0ControlFlow } from "../ir0/IR0ControlFlow";
import { IR1Script, IR1Function, IR1 } from "./IR1";
import { IR1Logger } from "./IR1Logger";

interface BasicBlockInfo {
    block: IR0BasicBlock,
    func: IR1Function,

    isEntrypoint: boolean,

    in: BasicBlockInfo[],
    out: BasicBlockInfo[],

    immediateDominator: BasicBlockInfo | null,
    immediateDominates: BasicBlockInfo[],

    reversePostorderIndex: number
};

export class IR1Emitter {
    public readonly ir1Script: IR1Script;
    public readonly ir0Script: IR0Script;

    // A map of basic blocks to their function heads
    public readonly functions: Map<IR0BasicBlock, IR1Function>;

    public readonly blocks: Map<IR0BasicBlock, BasicBlockInfo>;

    public constructor(ir0Script: IR0Script, ir1: IR1) {

        this.ir0Script = ir0Script;
        this.ir1Script = new IR1Script(ir1, ir0Script.spriteID);

        this.functions = new Map();
        this.functions.set(ir0Script.head, this.ir1Script.entrypoint);

        // Figure out which basic blocks correspond to function heads
        ir0Script.forEachBasicBlock(block => {
            switch (block.flow.type) {
                case IR0ControlFlowType.Next:
                    if (block.flow.status !== CatnipWasmEnumThreadStatus.RUNNING) {
                        // This is a yield, so the target block has to be a function
                        if (!this.functions.has(block.flow.next))
                            this.functions.set(block.flow.next, new IR1Function(this.ir1Script));
                    }
                    break;
                case IR0ControlFlowType.Call:
                    throw new Error("Not implemented.");
            }
        });

        this.blocks = new Map();

        // Create BasicBlockInfo for every basic block, while also linking up in and out blocks
        {
            const visitBlock = (block: IR0BasicBlock, func: IR1Function) => {

                let blockInfo = this.blocks.get(block);
                if (blockInfo !== undefined) return blockInfo;

                let blockFunc = this.functions.get(block);
                if (blockFunc === undefined)
                    blockFunc = func;

                blockInfo = {
                    block,
                    func: blockFunc,

                    isEntrypoint: false,

                    out: [],
                    in: [],

                    immediateDominator: null,
                    immediateDominates: [],

                    reversePostorderIndex: -1,
                };

                this.blocks.set(block, blockInfo);

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
                        throw new Error("Not implemented.");
                }

                return blockInfo;
            };

            visitBlock(this.ir0Script.head, this.ir1Script.entrypoint);
        }

        // We need to look for any blocks who are being called into from multiple functions
        //   Those blocks need to become their own functions if their not already.
        {

            const convertDecendants = (info: BasicBlockInfo) => {
                for (const child of info.out) {
                    if (child.func === info.func) continue;
                    if (this.functions.has(child.block)) continue;

                    child.func = info.func;
                    convertDecendants(child);
                }
            }

            const checkBlock = (info: BasicBlockInfo) => {
                if (this.functions.has(info.block)) {
                    info.isEntrypoint = true;
                    return;
                }

                let func: IR1Function = info.in[0].func;

                for (let i = 1; i < info.in.length; i++) {
                    if (func !== info.in[i].func) {
                        // We found one. We need to make this basic block into its own function
                        func = new IR1Function(this.ir1Script);

                        this.functions.set(info.block, func);
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

            const queue: BasicBlockInfo[] = [this.blocks.get(this.ir0Script.head)!];
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

        // Create the dominator tree for each function.
        for (const [entrypointBlock, func] of this.functions) {
            const entrypoint = this.blocks.get(entrypointBlock)!;

            IR1Logger.assert(entrypoint !== undefined);
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
            entrypoint.immediateDominator = entrypoint;

            // Code and comments below stolen from
            // https://github.com/WebAssembly/binaryen/blob/df6d943a3b2a33eb7f09c7b4db002f9d505601ff/src/cfg/domtree.h#L58

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
                        IR1Logger.assert(pred.func === entrypoint.func, true, "In-block from a different function in the middle of a function?");

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

            // Create the backward links in the dominator tree
            for (let i = 1; i < reversePostorder.length; i++) {
                const dominator = reversePostorder[i].immediateDominator;

                IR1Logger.assert(dominator !== null);

                dominator.immediateDominates.push(reversePostorder[i]);
            }
        }

    }

    public addGraphVisDominanceEdges(generator: IR0GraphVisDotGenerator) {
        generator.writeLine(`subgraph cluster_${generator.scripts.get(this.ir0Script)!} {`);
        generator.incrementIndentation();

        for (const blockInfo of this.blocks.values()) {
            if (blockInfo.immediateDominator === null) {
                IR1Logger.assert(blockInfo.isEntrypoint);
                generator.writeLine(`subgraph cluster_${generator.blocks.get(blockInfo.block)!.clusterName} { color=blue; }`);
                continue;
            }

            const blockGraphInfo = generator.blocks.get(blockInfo.block)!;
            const parentGraphInfo = generator.blocks.get(blockInfo.immediateDominator.block)!;

            generator.writeEdge(parentGraphInfo.finalNode, blockGraphInfo.firstNode, `color=black lhead="cluster_${blockGraphInfo.clusterName}" ltail="cluster_${parentGraphInfo.clusterName}"`);
        }

        generator.decrementIndentation();
        generator.writeLine(`}`);

    }

    public emitControlFlow(flow: IR0ControlFlow) {

        switch (flow.type) {
            case IR0ControlFlowType.Next:

                break;
        }
    }
}
