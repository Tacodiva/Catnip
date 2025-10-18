import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrBr extends IR1Instruction {

    public index: number;

    public constructor(index: number) {
        super();
        this.index = index;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.br, this.index);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`br ${this.index}`);
    }
}
