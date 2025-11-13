import { SpiderOpcodes } from "wasm-spider";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputOperatorNot extends IR0Input<["operand"]> {

    public constructor(operand: IR0Input) {
        super("operator_not", { operand: { value: operand, format: CatnipValueFormat.I32_BOOLEAN } });
    }

    public getResult(): CatnipValue {
        const value = this.args.operand.getResult();

        if (value.isConstant)
            return CatnipValue.constant(!value.asConstantBoolean(), CatnipValueFormat.I32_BOOLEAN);

        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => emitter.emitWasm(SpiderOpcodes.i32_eqz));
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorNot(this.args.operand.input.clone(ctx));
    }

}