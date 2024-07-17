import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompiler";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";

export const ir_const = new class extends CatnipIrInputOpType<{value: string}> {
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{ value: string; }>): void {
        ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(ir.inputs.value));
    }
}

export const op_const = new class extends CatnipInputOpType<{value: string}> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { value: string; }, format: CatnipInputFormat, flags: CatnipInputFlags): void {
        ctx.emitIrInput(ir_const, inputs, format, flags, {});
    }
}
