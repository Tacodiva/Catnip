import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export type cast_ir_inputs = {
    format: CatnipValueFormat,
};

/**
 * This operator compiles to nothing, but tells the compiler to treat a value as a certain type.
 */
export const ir_cast = new class extends CatnipIrInputOpType<cast_ir_inputs> {

    public constructor() { super("core_const"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipIrInputOp<cast_ir_inputs>): CatnipCompilerValue {

        if (CatnipValueFormatUtils.isAlways(ir.operands[0].format, ir.inputs.format)) {
            return ir.operands[0];
        }

        if (ir.operands[0].isConstant)
            CatnipCompilerLogger.warn("Casting a constant?");

        CatnipCompilerLogger.assert(
            CatnipValueFormatUtils.getFormatSpiderType(ir.operands[0].format) === CatnipValueFormatUtils.getFormatSpiderType(ir.inputs.format),
            true, `Cannot cast ${CatnipValueFormatUtils.stringify(ir.operands[0].format)} to different format ${CatnipValueFormatUtils.getFormatSpiderType(ir.inputs.format)}.`
        );

        return CatnipCompilerValue.dynamic(ir.inputs.format);
    }


    public generateWasm(): void {}

}