import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrOperatorJoin } from "../../ir1/operators/IR1InstrOperatorJoin";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";
import { CatnipValue } from "../../CatnipValue";


export class IR0InputOperatorJoin extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_join", CatnipValueFormat.I32_HSTRING, left, right);
    }

    public getResult(): CatnipValue {
        const left = this.getInputResult("left");
        const right = this.getInputResult("right");

        if (left.isConstant && right.isConstant) {
            return CatnipValue.constant(left.asConstantString() + right.asConstantString(), CatnipValueFormat.I32_HSTRING);
        }

        return CatnipValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrOperatorJoin();
    }
}
