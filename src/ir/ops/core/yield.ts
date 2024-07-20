import { SpiderOpcodes } from "wasm-spider";
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
        ctx.emitWasm(SpiderOpcodes.call, ir.branches.func.func.spiderFunction);
    }
}