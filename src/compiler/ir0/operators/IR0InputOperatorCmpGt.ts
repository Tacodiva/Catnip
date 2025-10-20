import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1InstrOperatorCmpLtGt, IR1InstrOperatorCmpLtGtType } from "../../ir1/operators/IR1InstrOperatorCmpLtGt";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";


export class IR0InputOperatorCmpGt extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_cmp_gt", CatnipValueFormat.F64, left, right);
    }

    public getResult(): CatnipValue {
        const left = this.args.left.getResult();
        const right = this.args.right.getResult();

        if (left.isConstant && right.isConstant)
            return CatnipValue.constant(left.asConstantNumber() > right.asConstantNumber(), CatnipValueFormat.I32_BOOLEAN);

        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrOperatorCmpLtGt(
            IR1InstrOperatorCmpLtGtType.GREATER_THAN,
            this.args.left.getResult().format,
            this.args.right.getResult().format
        );
    }
}
