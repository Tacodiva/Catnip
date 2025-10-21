import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR0Input } from "../IR0Node";


export abstract class IR0InputOperatorGenericBinary extends IR0Input<["left", "right"]> {
    public constructor(name: string, inputFormat: CatnipValueFormat, left: IR0Input, right: IR0Input) {
        super(name, {
            left: { value: left, format: inputFormat },
            right: { value: right, format: inputFormat }
        });
    }

    public getResult(): CatnipValue {
        return this._getResult(
            this.args.left.getResult(),
            this.args.right.getResult()
        )
    }

    protected abstract _getResult(left: CatnipValue, right: CatnipValue): CatnipValue;
}
