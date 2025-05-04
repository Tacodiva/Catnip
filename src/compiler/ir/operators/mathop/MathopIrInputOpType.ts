import { CatnipCompilerValue } from "../../../CatnipCompilerValue";
import { CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../../CatnipIrOp";
import { CatnipValueFormat } from "../../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../../CatnipValueFormatUtils";

export abstract class MathopIrInputOpType extends CatnipIrInputOpType {
    public constructor(op: string) { super(op); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant) {
            const constResult = this._calculateConstant(ir.operands[0].asConstantNumber());
            if (constResult !== null)
                return CatnipCompilerValue.constant(constResult, CatnipValueFormatUtils.getNumberFormat(constResult));
        }

        return CatnipCompilerValue.dynamic(this._getReturnType());
    }

    protected _getReturnType(): CatnipValueFormat {
        return CatnipValueFormat.F64_NUMBER_OR_NAN;
    }

    protected _calculateConstant(input: number): number | null {
        return null;
    }
}

