import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrTerminate extends IR1Instruction {
    public doesReturn: boolean = true;

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushThread();
        emitter.emitWasmPushNumber(SpiderNumberType.i32, CatnipWasmEnumThreadStatus.TERMINATED);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        emitter.emitWasm(SpiderOpcodes.return);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`terminate`);
    }
}
