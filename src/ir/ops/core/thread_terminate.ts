import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType } from "../../CatnipOp";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";

export const ir_thread_terminate = new class extends CatnipIrCommandOpType<{}> {
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, {}>): void {
        ctx.emitWasmGetThread();
        ctx.emitWasmRuntimeFunctionCall("catnip_thread_terminate");
        ctx.emitWasm(SpiderOpcodes.return);
    }
}

export const op_thread_terminate = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIrCommand(ir_thread_terminate, {}, {});
    }
}
