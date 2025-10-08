import { CatnipCommandList } from "../../ops";
import { CatnipScriptTrigger } from "../../ops/CatnipScriptTrigger";
import { CatnipScriptID } from "../../runtime/CatnipScript";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0Emitter } from "./IR0Emitter";
import { IR0Logger } from "./IR0Logger";
import { IR0Trigger } from "./IR0Trigger";



export class IR0 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR0Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.compiler.assertStage(CatnipCompilerStage.IR0_INIT);
        this.scripts = [];
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

export interface IR0ScriptInfo {
    spriteID: CatnipSpriteID;
    scriptID: CatnipSpriteID;
    commands: CatnipCommandList;
    trigger: CatnipScriptTrigger;
}

export class IR0Script {
    public readonly ir: IR0;

    public readonly trigger: IR0Trigger;

    public readonly spriteID: CatnipSpriteID;
    public readonly scriptID: CatnipScriptID;
    public readonly commands: CatnipCommandList;

    public head: IR0BasicBlock;

    public get isWarp() { return this.trigger.isWarp; }

    public constructor(ir: IR0, info: IR0ScriptInfo) {
        this.ir = ir;
        this.ir.compiler.assertStage(CatnipCompilerStage.IR0_INIT);

        this.spriteID = info.spriteID;
        this.scriptID = info.scriptID;
        this.commands = info.commands;

        this.head = new IR0BasicBlock();

        this.trigger = info.trigger.type.createIR(this, info.trigger.inputs);

        this.ir.scripts.push(this);
    }

    public generateInstructions() {
        this.ir.compiler.assertStage(CatnipCompilerStage.IR0_GEN);
        IR0Logger.assert(!this.head.isComplete);

        const emitter = new IR0Emitter(this);

        emitter.emitCommands(this.commands);
        emitter.completeBlock({
            type: IR0ControlFlowType.Return
        });

        IR0Logger.assert(this.head.isComplete);
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const clusterName = generator.getName();

        generator.scripts.set(this, clusterName);

        generator.writeLine(`subgraph cluster_${clusterName} {`);
        generator.incrementIndentation();

        const triggerNode = this.trigger.createGraphVisNode(generator);

        this.forEachBasicBlock((block) => block.createGraphVisNode(generator));
        this.forEachBasicBlock((block) => block.linkGraphVisNode(generator));

        const firstNode = generator.blocks.get(this.head)!.firstNode;

        generator.writeExecutionEdge(triggerNode, firstNode);

        generator.decrementIndentation();
        generator.writeLine(`}`);

        return firstNode;
    }

    public forEachBasicBlock(iterator: (block: IR0BasicBlock) => void) {
        const toDescend: IR0BasicBlock[] = [this.head];
        const alreadyIterated: Set<IR0BasicBlock> = new Set(toDescend);

        function descend(block: IR0BasicBlock) {
            if (alreadyIterated.has(block)) return;

            toDescend.push(block);
            alreadyIterated.add(block);
        }

        while (toDescend.length !== 0) {
            const block = toDescend.pop()!;

            iterator(block);

            if (!block.isComplete) continue;
            const flow = block.flow;

            switch (flow.type) { // We don't need Loop because it should have already been covered.
                case IR0ControlFlowType.Next: {
                    descend(flow.next);
                    break;
                }
                case IR0ControlFlowType.Condition: {
                    descend(flow.pass);
                    descend(flow.fail);
                    break;
                }
                case IR0ControlFlowType.Call: {
                    throw new Error("Not implemented.");
                }
            }
        }
    }
}

interface IR0InstructionArgument {
    value: IR0Input;
}

type IR0InstructionArguments<TArgs extends string[]> = {
    [K in TArgs[number]]: IR0InstructionArgument;
}

class IR0Node<TArgs extends string[] = string[]> {
    public readonly name: string;

    public readonly args: Readonly<IR0InstructionArguments<TArgs>>;

    constructor(name: string, args: IR0InstructionArguments<TArgs>) {
        this.name = name;
        this.args = args;
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        const nodeName = generator.getName();
        generator.writeLine(`${nodeName} ${this.getGraphVisNodeProperties()}`);

        for (const argName of Object.keys(this.args)) {
            const arg = (this.args as Record<string, IR0InstructionArgument>)[argName];
            const argNodeName = arg.value.createGraphVisNode(generator);

            generator.writeValueEdge(argNodeName, nodeName, argName);
        }
        return nodeName;
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name}"]`;
    }

}

export class IR0Instruction<TArgs extends string[] = string[]> extends IR0Node<TArgs> {

}

export class IR0Input<TArgs extends string[] = string[]> extends IR0Node<TArgs> {

}

interface BasicBlockInfo {
    clusterName: string;
    firstNode: string;
    finalNode: string;
}

export class IR0GraphVisDotGenerator {

    public indentation: number;
    public dot: string;
    public nextName: number;
    public edges: string[];

    public blocks: Map<IR0BasicBlock, BasicBlockInfo>;
    public scripts: Map<IR0Script, string>;

    public constructor() {
        this.dot = "digraph {\n  compound=true;";
        this.indentation = 1;
        this.nextName = 0;
        this.blocks = new Map();
        this.scripts = new Map();
        this.edges = [];
    }

    public getName(): string {
        return "" + (this.nextName++);
    }

    public writeLine(line: string) {
        this.dot += "\n";

        for (let i = 0; i < this.indentation; i++) {
            this.dot += "  ";
        }

        this.dot += line;
    }

    public writeEdge(from: string, to: string, props: string) {
        this.edges.push(`${from} -> ${to} [${props}]`);
    }

    public writeExecutionEdge(from: string, to: string, label?: string) {
        if (label) {
            this.writeEdge(from, to, `label="${label}" color=green`);
        } else {
            this.writeEdge(from, to, `color=green`);
        }
    }

    public writeValueEdge(from: string, to: string, label: string) {
        this.writeEdge(from, to, `label="${label}" color=blue arrowhead=vee`);
    }

    public incrementIndentation() {
        ++this.indentation;
    }

    public decrementIndentation() {
        --this.indentation;
    }

    public toDotFile(): string {
        this.dot += "\n";
        for (const edge of this.edges) {
            this.dot += "  " + edge + "\n";
        }
        return this.dot += "}";
    }

}