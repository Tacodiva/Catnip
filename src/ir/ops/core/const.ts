import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";

export const ir_const = new class extends CatnipIrInputOpType<{value: string | number}> {
    public constructor() { super("core_const"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{ value: string | number; }>): void {
        const value = ir.inputs.value;
        if (typeof value === "string") {
            ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(value));
        } else {
            ctx.emitWasmConst(SpiderNumberType.i32, value);
        }
    }
}

export const op_const = new class extends CatnipInputOpType<{value: string | number}> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { value: string | number; }, format: CatnipInputFormat, flags: CatnipInputFlags): void {
        ctx.emitIrInput(ir_const, inputs, format, flags, {});
    }
}
