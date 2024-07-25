import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOp, CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";

export type sub_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_sub = new class extends CatnipInputOpType<sub_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: sub_inputs, format: CatnipInputFormat, flags: CatnipInputFlags): void {
        ctx.emitInput(inputs.left, CatnipInputFormat.f64, CatnipInputFlags.NUMBER);
        ctx.emitInput(inputs.right, CatnipInputFormat.f64, CatnipInputFlags.NUMBER);
        ctx.emitIrCommand(ir_sub, { type: SpiderNumberType.f64 }, {});
    }
}

export type sub_ir_inputs = { type: SpiderNumberType };

export const ir_sub = new class extends CatnipIrInputOpType<sub_ir_inputs> {
    public constructor() { super("operators_sub"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<sub_ir_inputs>): void {
        switch (ir.inputs.type) {
            case SpiderNumberType.f64:
                ctx.emitWasm(SpiderOpcodes.f64_sub);
                break;
            case SpiderNumberType.i32:
                ctx.emitWasm(SpiderOpcodes.i32_sub);
                break;
            default:
                CatnipCompilerWasmGenContext.logger.assert(false, true, `'${ir.inputs.type}' type not supported by operation.`);
        }
    }
}

