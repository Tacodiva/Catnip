import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";
import { CatnipCompilerLogger } from "../../../compiler/CatnipCompilerLogger";

type const_inputs = { value: string | number };

export const ir_const = new class extends CatnipIrInputOpType<const_inputs> {
    public constructor() { super("core_const"); }

    public getOutputFormat(ir: CatnipIrInputOp<const_inputs>): CatnipInputFormat {
        if (typeof ir.inputs.value === "string") {
            return CatnipInputFormat.HSTRING_PTR;
        } else {
            if (ir.format === CatnipInputFormat.i32) {
                return CatnipInputFormat.i32;
            } else if (ir.format === CatnipInputFormat.ANY) {
                return CatnipInputFormat.f64;
            } else {
                CatnipCompilerLogger.assert(ir.format === CatnipInputFormat.f64);
                return CatnipInputFormat.f64;
            }
        }
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<const_inputs>): void {
        const value = ir.inputs.value;
        if (typeof value === "string") {
            ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(value));
        } else {
            if (ir.format === CatnipInputFormat.i32) {
                ctx.emitWasmConst(SpiderNumberType.i32, value);
            } else {
                ctx.emitWasmConst(SpiderNumberType.f64, value);
            }
        }
    }
}


export const op_const = new class extends CatnipInputOpType<const_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { value: string | number; }, format: CatnipInputFormat, flags: CatnipInputFlags): CatnipIrInputOp {
        return ctx.emitIrInput(ir_const, inputs, format, flags, {});
    }
}
