import { CatnipScriptTrigger } from "../../ops/CatnipScriptTrigger";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR0 } from "./IR0";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0ControlFlow, IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0Trigger } from "./IR0Trigger";

export interface IR0ScriptInfo {
    spriteID: CatnipSpriteID;
    trigger: CatnipScriptTrigger;
}

export class IR0Script {
    public readonly ir: IR0;

    public readonly trigger: IR0Trigger;

    public readonly spriteID: CatnipSpriteID;

    public head: IR0BasicBlock;

    public constructor(ir: IR0, info: IR0ScriptInfo) {
        this.ir = ir;
        this.ir.compiler.assertStage(CatnipCompilerStage.SB3_IR0_PREPASS);

        this.spriteID = info.spriteID;

        this.head = new IR0BasicBlock(this);

        this.trigger = info.trigger.type.createIR(this, info.trigger.inputs);

        this.ir.scripts.push(this);
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const scriptInfo = generator.getScriptInfo(this);

        generator.writeLine(`subgraph cluster_${scriptInfo.clusterName} {`);
        generator.incrementIndentation();

        this.trigger.createGraphVisNode(generator, scriptInfo.triggerNode);

        this.forEachBasicBlock((block) => {
            block.createGraphVisNode(generator);
            return false;
        });

        this.forEachBasicBlock((block) => block.linkGraphVisNode(generator));

        const firstNode = generator.blocks.get(this.head)!.firstNode;

        generator.writeExecutionEdge(scriptInfo.triggerNode, firstNode);

        generator.decrementIndentation();
        generator.writeLine(`}`);

        return firstNode;
    }

    /**
     * @param iterator Return true to terminate iteration early.
     * @returns True if the iteration was exited early.
     */
    public forEachBasicBlock(iterator: (block: IR0BasicBlock) => (boolean | void)): boolean {
        const toDescend: IR0BasicBlock[] = [this.head];
        const alreadyIterated: Set<IR0BasicBlock> = new Set(toDescend);

        function descend(block: IR0BasicBlock) {
            if (alreadyIterated.has(block)) return;

            toDescend.push(block);
            alreadyIterated.add(block);
        }

        while (toDescend.length !== 0) {
            const block = toDescend.pop()!;

            if (iterator(block)) return true;

            if (!block.isComplete) continue;

            IR0ControlFlow.forEachBlock(block.flow, descend);
        }

        return false;
    }
}
