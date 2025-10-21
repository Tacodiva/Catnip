import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export type IR1InstrSimpleEmitter = (emitter: CatnipCompilerWasmEmitter) => void;

export class IR1InstrSimple extends IR1Instruction {
    public readonly name: string;
    public readonly emitFunc: IR1InstrSimpleEmitter;

    public constructor(name: string, emitter: IR1InstrSimpleEmitter) {
        super();
        this.name = name;
        this.emitFunc = emitter;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        this.emitFunc(emitter);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(this.name);
    }

}