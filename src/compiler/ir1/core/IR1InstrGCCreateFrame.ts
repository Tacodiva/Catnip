import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrGCCreateFrame extends IR1Instruction {

    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.createGCFrame(true);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`gc_create_frame`);
    }

}