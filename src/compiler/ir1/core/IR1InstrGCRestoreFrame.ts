import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrGCRestoreFrame extends IR1Instruction {

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.restoreGCFrame();
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`gc_restore_frame`);
    }

}