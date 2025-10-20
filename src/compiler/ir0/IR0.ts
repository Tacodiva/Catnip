import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0Script } from "./IR0Script";

export enum IR0BasicBlockGraphEdgeType {
    Simple,
    Call,
    Return
}

export interface IR0BasicBlockGraphNode {
    readonly block: IR0BasicBlock;
    in: IR0BasicBlockGraphNode[];
    out: IR0BasicBlockGraphNode[];
}

export class IR0 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR0Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.compiler.assertStage(CatnipCompilerStage.SB3_IR0_PREPASS);

        this.scripts = [];
    }

    /**
     * @param iterator Return true to terminate iteration early.
     * @returns True if the iteration was exited early.
     */
    public forEachBasicBlock(iterator: (block: IR0BasicBlock, script: IR0Script) => (boolean | void)): boolean {
        for (const script of this.scripts) {
            if (script.forEachBasicBlock(block => iterator(block, script))) return true;
        }
        return false;
    }

    public forEachBasicBlockGraphEdge(iterateEdge: (from: IR0BasicBlock, to: IR0BasicBlock, type: IR0BasicBlockGraphEdgeType) => void, includeCalls: boolean): void {
        const scriptReturnLocations: Map<IR0Script, IR0BasicBlock[]> = new Map();

        this.forEachBasicBlock(block => {
            switch (block.flow.type) {
                case IR0ControlFlowType.Call:

                    if (includeCalls) {
                        iterateEdge(block, block.flow.procedure.head, IR0BasicBlockGraphEdgeType.Call);

                        let returnLocations = scriptReturnLocations.get(block.flow.procedure);
                        if (returnLocations === undefined)
                            scriptReturnLocations.set(block.flow.procedure, returnLocations = []);

                        returnLocations.push(block.flow.next);
                    } else {
                        iterateEdge(block, block.flow.next, IR0BasicBlockGraphEdgeType.Return);
                    }

                    break;

                case IR0ControlFlowType.Condition:
                    iterateEdge(block, block.flow.pass, IR0BasicBlockGraphEdgeType.Simple);
                    iterateEdge(block, block.flow.fail, IR0BasicBlockGraphEdgeType.Simple);
                    break;

                case IR0ControlFlowType.Next:
                    iterateEdge(block, block.flow.next, IR0BasicBlockGraphEdgeType.Simple);
                    break;
            }
        });

        if (!includeCalls) return;

        this.forEachBasicBlock((block, script) => {
            if (block.flow.type !== IR0ControlFlowType.Return) return;
            const returnLocations = scriptReturnLocations.get(script);
            if (returnLocations === undefined) return;

            for (const returnLocation of returnLocations)
                iterateEdge(returnLocation, block, IR0BasicBlockGraphEdgeType.Return);
        });
    }

    public createBasicBlockGraph(includeCalls: boolean): Map<IR0BasicBlock, IR0BasicBlockGraphNode> {
        const blocks: Map<IR0BasicBlock, IR0BasicBlockGraphNode> = new Map();

        function getBlockInfo(block: IR0BasicBlock): IR0BasicBlockGraphNode {
            let info = blocks.get(block);
            if (info === undefined) {
                blocks.set(block, info = { block, in: [], out: [] });
            }
            return info;
        }

        this.forEachBasicBlockGraphEdge((from, to) => {
            const fromInfo = getBlockInfo(from);
            const toInfo = getBlockInfo(to);

            fromInfo.out.push(toInfo);
            toInfo.in.push(fromInfo);
        }, includeCalls);

        return blocks;
    }

    public createGraphVis(): string;
    public createGraphVis(generator: IR0GraphVisDotGenerator): void;

    public createGraphVis(gen?: IR0GraphVisDotGenerator): string | void {

        let generator: IR0GraphVisDotGenerator;

        if (gen) generator = gen;
        else generator = new IR0GraphVisDotGenerator();

        for (const script of this.scripts) script.createGraphVisNode(generator);

        if (gen) return;
        return generator.toDotFile();
    }
}
