import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOp, CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";

export type add_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_add = new class extends CatnipInputOpType<add_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: add_inputs, format: CatnipInputFormat, flags: CatnipInputFlags): CatnipIrInputOp {
        ctx.emitInput(inputs.left, CatnipInputFormat.f64, CatnipInputFlags.NUMBER);
        ctx.emitInput(inputs.right, CatnipInputFormat.f64, CatnipInputFlags.NUMBER);
        return ctx.emitIrInput(ir_add, { type: SpiderNumberType.f64 }, format, flags, {});
    }
}

export type add_ir_inputs = { type: SpiderNumberType };

export const ir_add = new class extends CatnipIrInputOpType<add_ir_inputs> {
    public constructor() { super("operators_add"); }

    public getOutputFormat(ir: CatnipIrInputOp<add_ir_inputs>): CatnipInputFormat {
        switch (ir.inputs.type) {
            case SpiderNumberType.f64:
                return CatnipInputFormat.f64;
            case SpiderNumberType.i32:
                return CatnipInputFormat.i32;
            default:
                CatnipCompilerWasmGenContext.logger.assert(false, true, `'${ir.inputs.type}' type not supported by operation.`);
        }
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<add_ir_inputs>): void {
        switch (ir.inputs.type) {
            case SpiderNumberType.f64:
                ctx.emitWasm(SpiderOpcodes.f64_add);
                break;
            case SpiderNumberType.i32:
                ctx.emitWasm(SpiderOpcodes.i32_add);
                break;
            default:
                CatnipCompilerWasmGenContext.logger.assert(false, true, `'${ir.inputs.type}' type not supported by operation.`);
        }
    }
}

