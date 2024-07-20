import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch, CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType } from "../../CatnipOp";

export const op_yield = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitYield();
    }
}

export const ir_yield = new class extends CatnipIrCommandOpType<{}, {func: CatnipIrBranch}> {

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, {func: CatnipIrBranch}>): void {
        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, ir.branches.func.func.functionTableIndex);
        ctx.emitWasmRuntimeFunctionCall("catnip_thread_yield");
        ctx.emitWasm(SpiderOpcodes.return);
    }
}