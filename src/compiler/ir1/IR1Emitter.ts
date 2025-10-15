import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { IR0GraphVisDotGenerator, IR0Input, IR0Command, IR0Script, IR0Node } from "../ir0/IR0";
import { IR0BasicBlock } from "../ir0/IR0BasicBlock";
import { IR0ControlFlowType, IR0ControlFlow } from "../ir0/IR0ControlFlow";
import { IR1InstrCall, IR1InstrBlock, IR1InstrBr, IR1InstrLoop, IR1InstrYield, IR1InstrIf, IR1InstrReturn, IR1InstrTerminate } from "./instructions/blah";
import { IR1InstrCast } from "./instructions/IR1InstrCast";
import { IR1Script, IR1Function, IR1, IR1Instruction } from "./IR1";
import { IR1Logger } from "./IR1Logger";

// Holds additional info we need about each basic block for translating it to IR1
interface BasicBlockInfo {
    block: IR0BasicBlock,
    func: IR1Function,

    isEntrypoint: boolean,
    isMerge: boolean,
    isLoopHead: boolean,

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
    private readonly _functions: Map<IR0BasicBlock, IR1Function>;

    // A map of basic blocks to their extended basic block info
    private readonly _blocks: Map<IR0BasicBlock, BasicBlockInfo>;

    public get compiler() { return this.ir1Script.ir.compiler; }

    public constructor(ir0Script: IR0Script, ir1: IR1) {

        this.ir0Script = ir0Script;
        this.ir1Script = new IR1Script(ir1, ir0Script.trigger.toIR1(), ir0Script.spriteID);

        this._functions = new Map();
        this._functions.set(ir0Script.head, this.ir1Script.entrypoint);

        // Figure out which basic blocks correspond to function heads
        ir0Script.forEachBasicBlock(block => {
            switch (block.flow.type) {
                case IR0ControlFlowType.Next:
                    if (block.flow.status !== CatnipWasmEnumThreadStatus.RUNNING) {
                        // This is a yield, so the target block has to be a function
                        if (!this._functions.has(block.flow.next))
                            this._functions.set(block.flow.next, new IR1Function(this.ir1Script));
                    }
                    break;
                case IR0ControlFlowType.Call:
                    throw new Error("Not implemented.");
            }
        });


        // Create BasicBlockInfo for every basic block, while also linking up in and out blocks
        this._blocks = new Map();

        {
            const visitBlock = (block: IR0BasicBlock, func: IR1Function) => {

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

                let func: IR1Function = info.in[0].func;

                for (let i = 1; i < info.in.length; i++) {
                    if (func !== info.in[i].func) {
                        // We found one. We need to make this basic block into its own function
                        func = new IR1Function(this.ir1Script);

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

            const queue: BasicBlockInfo[] = [this._blocks.get(this.ir0Script.head)!];
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
        //  - Create the dominator tree for each function.
        for (const [entrypointBlock, func] of this._functions) {
            const entrypoint = this._blocks.get(entrypointBlock)!;

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

            // Now we've got the reverse postorder index, we can cateogrize each block in the function
            for (const block of reversePostorder) {
                IR1Logger.assert(!block.isLoopHead);
                IR1Logger.assert(!block.isMerge);

                let foundForwardEdge = false;

                for (const inBlock of block.in) {
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

            }

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

        for (const blockInfo of this._blocks.values()) {

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
            const dominatorGraphInfo = generator.blocks.get(blockInfo.immediateDominator.block)!;
            generator.writeEdge(dominatorGraphInfo.finalNode, blockGraphInfo.firstNode, `color=black lhead="cluster_${blockGraphInfo.clusterName}" ltail="cluster_${dominatorGraphInfo.clusterName}"`);

            // Function ownership edges
            // const funcEntrypointGraphInfo = generator.blocks.get([...this.functions].find(([block, func]) => func === blockInfo.func)![0])!;
            // generator.writeEdge(blockGraphInfo.firstNode, funcEntrypointGraphInfo.firstNode, `color=red lhead="cluster_${funcEntrypointGraphInfo.clusterName}" ltail="cluster_${blockGraphInfo.clusterName}"`);
        }

        generator.decrementIndentation();
        generator.writeLine(`}`);
    }

    public emitAll(): void {
        for (const entrypoint of this._functions.keys())
            this.emitFunction(this._blocks.get(entrypoint)!);
    }

    private emitFunction(entrypoint: BasicBlockInfo): void {

        const func = entrypoint.func;

        IR1Logger.assert(entrypoint.isEntrypoint);
        IR1Logger.assert(entrypoint.func === this._functions.get(entrypoint.block));

        enum ContainingSyntaxType {
            BlockFollowedBy,
            LoopHeadedBy,
            IfElseThen
        }

        interface ContainingSyntax {
            type: ContainingSyntaxType,
            block: BasicBlockInfo | null
        };

        class Context {
            public frames: ContainingSyntax[];
            public fallthrough: BasicBlockInfo | null;

            public constructor(frames?: ContainingSyntax[], fallthrough?: BasicBlockInfo | null) {
                this.frames = frames ?? [];
                this.fallthrough = fallthrough ?? null;
            }

            public inside(frame: ContainingSyntax): Context {
                return new Context([frame, ...this.frames], this.fallthrough);
            }

            public withFallthrough(fallthrough: BasicBlockInfo): Context {
                return new Context([...this.frames], fallthrough);
            }

            public getBrIndex(target: BasicBlockInfo): number {

                for (let i = 0; i < this.frames.length; i++) {
                    if (this.frames[i].block === target) return i;
                }

                throw new Error("Target label not in context.");
            }

            public clone(): Context {
                return new Context([...this.frames], this.fallthrough)
            }
        }

        // We're gonna do this the stupid functional way for now but i'll go back and change it

        function doNode(block: BasicBlockInfo, ctx: Context): IR1Instruction[] {

            // Sanity check, every block we immediatly dominate should belong to this function
            IR1Logger.assert(block.immediateDominates.findIndex(a => a.func !== func) === -1);

            const selectedChildren = block.immediateDominates
                .filter(x => x.isMerge)
                .sort((x, y) => x.reversePostorderIndex - y.reversePostorderIndex);

            if (block.isLoopHead) {

                const loopCtx = ctx.inside({
                    type: ContainingSyntaxType.LoopHeadedBy,
                    block
                });

                const loopBody = nodeWithin(block, selectedChildren, null, loopCtx);

                return [new IR1InstrLoop(loopBody)];
            }

            return nodeWithin(block, selectedChildren, null, ctx);
        }

        const nodeWithin = (
            x: BasicBlockInfo,
            children: BasicBlockInfo[],
            followMark: BasicBlockInfo | null,
            ctx: Context
        ): IR1Instruction[] => {

            if (children.length !== 0) {

                // If we have a pending "follow" mark (a label after a block), insert a Block frame
                // and proceed with the rest.
                if (followMark !== null) {
                    const blockCtx = ctx.inside({
                        type: ContainingSyntaxType.BlockFollowedBy,
                        block: followMark
                    });
                    const blockBody = nodeWithin(x, children, null, blockCtx);
                    return [new IR1InstrBlock(blockBody)];
                }

                const y = children[0];
                const rest = children.slice(1);

                const left = nodeWithin(
                    x, rest, y, ctx.withFallthrough(y)
                );

                const right = doNode(y, ctx);

                return [...left, ...right];
            }

            // If no children remain but we still carry a followMark, wrap this in a block.
            // We don't need to do that if the block will generate an if because we can just br to the end of the if
            if (followMark !== null && !generatesIf(x)) {
                // TODO This is code duplication

                const blockCtx = ctx.inside({
                    type: ContainingSyntaxType.BlockFollowedBy,
                    block: followMark
                });
                const blockBody = nodeWithin(x, children, null, blockCtx);
                return [new IR1InstrBlock(blockBody)];
            }


            const body: IR1Instruction[] = [];

            for (const command of x.block.commands) {
                this.emitIR0(command, body);
            }

            const flow = x.block.flow;

            switch (flow.type) {
                case IR0ControlFlowType.Next: {

                    const next = this._blocks.get(flow.next)!;

                    if (flow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                        body.push(...doBranch(x, next, ctx));
                    } else {
                        // If we yield to a function, it should be an entrypoint
                        CatnipCompilerLogger.assert(next.isEntrypoint);
                        body.push(new IR1InstrYield(next.func, flow.status));
                    }

                    break;
                }

                case IR0ControlFlowType.Condition: {

                    this.emitIR0Input(flow.condition, CatnipValueFormat.I32_BOOLEAN, body);

                    const branchCtx = ctx.inside({
                        type: ContainingSyntaxType.IfElseThen,
                        block: followMark
                    });

                    const passBranch = doBranch(x, this._blocks.get(flow.pass)!, branchCtx.clone());
                    const failBranch = doBranch(x, this._blocks.get(flow.fail)!, branchCtx.clone());

                    body.push(new IR1InstrIf(passBranch, failBranch));
                    break;
                }

                case IR0ControlFlowType.Return: {
                    // body.push(new IR1InstrReturn());
                    body.push(new IR1InstrTerminate());
                    break;
                }

                case IR0ControlFlowType.Call:
                    throw new Error("Not implemented.")

            }

            return body;

            function doBranch(from: BasicBlockInfo, to: BasicBlockInfo, ctx: Context): IR1Instruction[] {

                if (from.func !== to.func) {
                    // If we're branching to a different function, that function should be an entrypoint
                    CatnipCompilerLogger.assert(to.isEntrypoint);
                    return [new IR1InstrCall(to.func)];
                }

                if (ctx.fallthrough === to) {
                    return [];
                }

                const isBackedge = from.reversePostorderIndex >= to.reversePostorderIndex;

                // If this is a backedge, the target should be a loop head
                IR1Logger.assert(!isBackedge || to.isLoopHead);

                if (isBackedge || to.isMerge) {
                    return [new IR1InstrBr(ctx.getBrIndex(to))];
                }

                return doNode(to, ctx);
            }
        }

        function generatesIf(block: BasicBlockInfo) {
            return block.block.flow.type === IR0ControlFlowType.Condition;
        }

        func.body = doNode(entrypoint, new Context());

    }

    private emitIR0Input(input: IR0Input, expectedFormat: CatnipValueFormat, body: IR1Instruction[]): void {
        input.requestResultFormat(expectedFormat);

        this.emitIR0(input, body);

        const resultFormat = input.getResultFormat();

        if (!CatnipValueFormatUtils.isAlways(resultFormat, expectedFormat)) {
            body.push(new IR1InstrCast(resultFormat, expectedFormat));
        }
    }

    private emitIR0(node: IR0Node, body: IR1Instruction[]): void {
        for (const argName in node.args) {
            const arg = node.args[argName];
            this.emitIR0Input(arg.value, arg.format, body);
        }

        const emitted = node.emitIR1(this);

        if (Array.isArray(emitted)) body.push(...emitted);
        else body.push(emitted);
    }
}
