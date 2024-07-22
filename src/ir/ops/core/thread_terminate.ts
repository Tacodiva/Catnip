import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType } from "../../CatnipOp";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";

export const op_thread_terminate = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIrCommand(ir_thread_terminate, {}, {});
    }
}

export const ir_thread_terminate = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("core_thread_terminate"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, {}>): void {
        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumThreadStatus.TERMINATED);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        ctx.emitWasm(SpiderOpcodes.return);
    }
}