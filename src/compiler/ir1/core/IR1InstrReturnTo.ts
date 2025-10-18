import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { IR1ExternalValueType } from "../IR1ExternalValue";


export class IR1InstrReturnTo extends IR1Instruction {
    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        emitter.emitWasmPushThread();
        emitter.emitWasmPushExternalValue({ type: IR1ExternalValueType.RETURN_LOCATION });
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("function"));


        emitter.emitWasm(SpiderOpcodes.return);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`return_to`);
    }
}
