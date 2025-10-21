
import { CatnipValue } from "../../CatnipValue";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";


export class IR0InputNothing extends IR0Input<[]> {
    public constructor() {
        super("nothing", {});
    }

    public getResult(): CatnipValue {
        return CatnipValue.none();
    }

    public emitIR1(emitter: IR1Emitter) {
        return [];
    }

    public clone() {
        return new IR0InputNothing();
    }
}
