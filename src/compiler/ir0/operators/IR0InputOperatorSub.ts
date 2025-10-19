import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1InstrOperatorCmpGt } from "../../ir1/operators/IR1InstrOperatorCmpGt";
import { IR1InstrOperatorSub } from "../../ir1/operators/IR1InstrOperatorSub";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";

export class IR0InputOperatorSub extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_sub", CatnipValueFormat.F64_NUMBER, left, right);
    }

    public getResultFormat(): CatnipValueFormat {
        return CatnipValueFormat.F64_NUMBER_OR_NAN;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrOperatorSub();
    }
}
