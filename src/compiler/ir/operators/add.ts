import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFormat } from "../../types";


export type add_ir_inputs = { type: SpiderNumberType };

export const ir_add = new class extends CatnipIrInputOpType<add_ir_inputs> {
    public constructor() { super("operators_add"); }

    public getOperandCount(inputs: add_ir_inputs, branches: {}): number {
        return 2;
    }

    public getResult(inputs: add_ir_inputs): CatnipCompilerValue {
        switch (inputs.type) {
            case SpiderNumberType.f64:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.F64_NUMBER_OR_NAN };
            case SpiderNumberType.i32:
                return { type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.I32_NUMBER };
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

