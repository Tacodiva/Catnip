import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCompiler } from "../CatnipCompiler";
import { IR0 } from "../ir0/IR0";
import { WasmEmitter } from "../wasm/WasmEmitter";
import { IR1Logger } from "./IR1Logger";

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
    public readonly spriteID: CatnipSpriteID;

    public entrypoint: IR1Function;
    public functions: IR1Function[];

    public constructor(ir: IR1, spriteID: CatnipSpriteID) {
        this.ir = ir;
        this.spriteID = spriteID;
        this.functions = [];
        this.entrypoint = new IR1Function(this);

        this.ir.scripts.push(this);
    }

    public stringify(ctx?: IR1StringificationContext): void {
        ctx ??= new IR1StringificationContext();
        
        ctx.openBlock("script");

        ctx.writeLine(`entrypoint ${ctx.getFunctionName(this.entrypoint)}`);

        for (const func of this.functions) func.stringify(ctx);

        ctx.closeBlock();
    }

}

export class IR1Function {
    public readonly script: IR1Script;
    private _body: IR1Instruction[] | null;

    public get body(): IR1Instruction[] {
        if (this._body === null) throw new Error("Body not generated yet.")
        return this._body;
    }

    public set body(value: IR1Instruction[]) {
        if (this._body !== null) throw new Error("Body already generated.")
        this._body = value;
    }

    public constructor(script: IR1Script) {
        this.script = script;
        this._body = null;

        this.script.functions.push(this);
    }

    public stringify(ctx: IR1StringificationContext): void {
        if (this._body === null) {
            ctx.writeLine(`${ctx.getFunctionName(this)} not generated`)
        } else {
            ctx.openBlock(ctx.getFunctionName(this));
            ctx.writeInstructions(this._body)
            ctx.closeBlock();
        }
        ctx.writeLine();
    }
}

export abstract class IR1Instruction {

    public abstract stringify(ctx: IR1StringificationContext): void;

    public abstract emitWasm(emitter: WasmEmitter): void;
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