import { CatnipValue } from "../../../CatnipValue";
import { CatnipValueFormat } from "../../../CatnipValueFormat";
import { IR0Input } from "../../IR0Node";

export abstract class IR0InputOperatorGenericMathop extends IR0Input<["operand"]> {
    public constructor(name: string, operand: IR0Input) {
        super(name, {
            operand: {
                value: operand,
                format: CatnipValueFormat.F64_NUMBER
            }
        });
    }

    public getResult(): CatnipValue {
        const operandResult = this.args.operand.getResult();

        if (operandResult.isConstant) {
            const constantResult = this._calculateConstant(operandResult.asConstantNumber());
            if (constantResult !== null) return CatnipValue.constantF64(constantResult);
        }

        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    protected _calculateConstant(input: number): number | null {
        return null;
    }
}