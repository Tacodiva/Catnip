import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { IR0 } from "../ir0/IR0";
import { CatnipCompilerWasmEmitter } from "../wasm/CatnipCompilerWasmEmitter";
import { IR1Function } from "./IR1Function";
import { IR1Logger } from "./IR1Logger";
import { IR1Trigger } from "./IR1Trigger";

export class IR1 {

    public readonly compiler: CatnipCompiler;
    public readonly scripts: IR1Script[];

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;

        this.scripts = [];
    }

    public stringify(): string {
        const ctx = new IR1StringificationContext();

        for (const script of this.scripts) {
            script.stringify(ctx);
        }

        return ctx.toString();
    }
}

export class IR1Script {
    public readonly ir: IR1;
    public readonly trigger: IR1Trigger;
    public readonly spriteID: CatnipSpriteID;

    public entrypoint: IR1Function;
    public functions: IR1Function[];

    public constructor(ir: IR1, trigger: IR1Trigger, spriteID: CatnipSpriteID) {
        this.ir = ir;
        this.trigger = trigger;
        this.spriteID = spriteID;
        this.functions = [];
        this.entrypoint = new IR1Function(this);

        this.ir.scripts.push(this);
    }

    public stringify(ctx?: IR1StringificationContext): void {
        ctx ??= new IR1StringificationContext();
        
        ctx.openBlock("script");

        ctx.writeLine(`entrypoint ${ctx.getFunctionName(this.entrypoint)}`);
        ctx.writeLine(`trigger ${this.trigger.stringify()}`);
        ctx.writeLine();

        for (const func of this.functions) func.stringify(ctx);

        ctx.closeBlock();
    }

}

export type IR1Expression = IR1Instruction[];

export type IR1InstructionArgs<TArgs extends string[] = string[]> = {
    [K in TArgs[number]]: IR1Expression;
}


export abstract class IR1Instruction {

    public abstract stringify(ctx: IR1StringificationContext): void;

    public abstract emitWasm(emitter: CatnipCompilerWasmEmitter): void;
}

export class IR1StringificationContext {

    public code: string;
    public indentation: number;

    public functionNames: Map<IR1Function, string>;
    private _functionNameIdx: number;

    public constructor() {
        this.code = "";
        this.indentation = 0;

        this.functionNames = new Map();
        this._functionNameIdx = 0;
    }

    public getFunctionName(func: IR1Function) {
        let name = this.functionNames.get(func);
        if (name) return name;
        name = "func" + (this._functionNameIdx++);
        this.functionNames.set(func, name);
        return name;
    }

    public indent() {
        for (let i = 0; i < this.indentation; i++) this.code += "  ";
    }

    public writeLine(line?: string) {
        if (line) {
            this.indent();
            this.code += line;
        }
        this.code += "\n";
    }

    public openBlock(line: string) {
        this.writeLine(line + " {");
        ++this.indentation;
    }

    public closeBlock() {
        --this.indentation;
        this.writeLine("}");
    }

    public writeInstructions(instrs: IR1Instruction[]) {
        for (const instr of instrs) {
            instr.stringify(this);
        }
    }

    public toString() {
        return this.code;
    }
}