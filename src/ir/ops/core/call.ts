import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrFunction } from "../../../compiler/CatnipIrFunction";
import { CatnipIrBranch, CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";

export const ir_call = new class extends CatnipIrCommandOpType<{}, {func: CatnipIrBranch}> {

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, {func: CatnipIrBranch}>): void {
        ctx.emitWasm(SpiderOpcodes.call, ir.branches.func.func.spiderFunction);
    }
}