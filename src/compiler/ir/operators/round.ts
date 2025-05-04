import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_round = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_round"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant) {
            const value = Math.round(ir.operands[0].asConstantNumber());
            return CatnipCompilerValue.constant(value, CatnipValueFormatUtils.getNumberFormat(value));
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_INT);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_math_round");
    }
}

