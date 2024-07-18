import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrFunction } from "../../../compiler/CatnipIrFunction";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";

export const ir_call = new class extends CatnipIrCommandOpType<{func: CatnipIrFunction}> {

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{func: CatnipIrFunction}, {}>): void {
        ctx.emitWasm(SpiderOpcodes.call, ir.inputs.func.spiderFunction);
    }
}