import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrJoin } from "../../ir1/operators/IR1InstrJoin";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";


export class IR0InputJoin extends IR0Input<["left", "right"]> {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_join", {
            left: { value: left, format: CatnipValueFormat.I32_HSTRING },
            right: { value: right, format: CatnipValueFormat.I32_HSTRING }
        });
    }

    public getResultFormat(): CatnipValueFormat {
        return CatnipValueFormat.I32_HSTRING;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrJoin();
    }
}
