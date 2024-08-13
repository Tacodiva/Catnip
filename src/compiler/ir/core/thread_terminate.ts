import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";

export const ir_thread_terminate = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("core_thread_terminate"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp): void {
        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumThreadStatus.TERMINATED);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        ctx.emitWasm(SpiderOpcodes.return);
    }
}