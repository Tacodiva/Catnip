import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";

export type sub_ir_inputs = { type: SpiderNumberType };

export const ir_sub = new class extends CatnipIrInputOpType<sub_ir_inputs> {
    public constructor() { super("operators_sub"); }

    public getOperandCount(): number { return 2; }

    public getResult(inputs: sub_ir_inputs): CatnipCompilerValue {
        switch (inputs.type) {
            case SpiderNumberType.f64:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.f64, flags: CatnipValueFlags.ANY };
            case SpiderNumberType.i32:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.i32, flags: CatnipValueFlags.ANY };
            default:
                CatnipCompilerWasmGenContext.logger.assert(false, true, `'${inputs.type}' type not supported by operation.`);
        }
    }

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

