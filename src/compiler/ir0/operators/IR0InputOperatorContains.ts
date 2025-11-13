import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputOperatorContains extends IR0Input<["a", "b"]> {
    public constructor(a: IR0Input, b: IR0Input) {
        super("operator_contains", {
            a: {
                value: a,
                format: CatnipValueFormat.I32_HSTRING
            },
            b: {
                value: b,
                format: CatnipValueFormat.I32_HSTRING
            }
        });
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorContains(this.args.a.input.clone(ctx), this.args.b.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_contains", true);
        });
    }
}