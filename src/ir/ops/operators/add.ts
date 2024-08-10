import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOp, CatnipInputOpType } from "../../CatnipOp";
import { CatnipValueFormat, CatnipValueFlags } from "../../types";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";

export type add_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_add = new class extends CatnipInputOpType<add_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: add_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.f64, CatnipValueFlags.NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.f64, CatnipValueFlags.NUMBER);
        ctx.emitIr(ir_add, { type: SpiderNumberType.f64 }, {});
    }
}

export type add_ir_inputs = { type: SpiderNumberType };

export const ir_add = new class extends CatnipIrInputOpType<add_ir_inputs> {
    public constructor() { super("operators_add"); }

    public getOperandCount(inputs: add_ir_inputs, branches: {}): number {
        return 2;
    }

    public getResult(inputs: add_ir_inputs): CatnipCompilerValue {
        switch (inputs.type) {
            case SpiderNumberType.f64:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.f64, flags: CatnipValueFlags.ANY };
            case SpiderNumberType.i32:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.i32, flags: CatnipValueFlags.ANY };
            default:
                CatnipCompilerWasmGenContext.logger.assert(false, true, `'${inputs.type}' type not supported by operation.`);
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

