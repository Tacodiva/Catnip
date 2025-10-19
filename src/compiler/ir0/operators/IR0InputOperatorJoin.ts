import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrOperatorJoin } from "../../ir1/operators/IR1InstrOperatorJoin";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";


export class IR0InputOperatorJoin extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_join", CatnipValueFormat.I32_HSTRING, left, right);
    }

    public getResultFormat(): CatnipValueFormat {
        return CatnipValueFormat.I32_HSTRING;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrOperatorJoin();
    }
}
