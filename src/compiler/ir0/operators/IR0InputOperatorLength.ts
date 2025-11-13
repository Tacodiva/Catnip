import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputOperatorLength extends IR0Input<["str"]> {
    public constructor(str: IR0Input) {
        super("operator_length", {
            str: {
                value: str,
                format: CatnipValueFormat.I32_HSTRING
            }
        });
    }

    public getResult(): CatnipValue {
        const strResult = this.args.str.getResult();

        if (strResult.isConstant)
            return CatnipValue.constant(strResult.asConstantString().length, CatnipValueFormat.I32_NUMBER);

        return CatnipValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public clone(ctx: IR0CloneContext): IR0Input<["str"]> {
        return new IR0InputOperatorLength(this.args.str.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_length", true));
    }
}