import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";


export type add_ir_inputs = { type: SpiderNumberType };

export const ir_add = new class extends CatnipIrInputOpType<add_ir_inputs> {
    public constructor() { super("operators_add"); }

    public getOperandCount(inputs: add_ir_inputs, branches: {}): number {
        return 2;
    }

    public getResult(inputs: add_ir_inputs, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {

        if (operands[0].isConstant && operands[1].isConstant) {
            const value = Cast.toNumber(operands[0].value) + Cast.toNumber(operands[1].value);
            return { isConstant: true, value, format: CatnipValueFormatUtils.getNumberFormat(value) }
        }

        switch (inputs.type) {
            case SpiderNumberType.f64:
                return { isConstant: false, format: CatnipValueFormat.F64_NUMBER_OR_NAN };
            case SpiderNumberType.i32:
                return { isConstant: false, format: CatnipValueFormat.I32_NUMBER };
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

