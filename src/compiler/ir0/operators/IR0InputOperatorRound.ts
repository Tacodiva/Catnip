import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputOperatorRound extends IR0Input<["operand"]> {
    public constructor(str: IR0Input) {
        super("operator_round", {
            operand: {
                value: str,
                format: CatnipValueFormat.F64_NUMBER
            }
        });
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorRound(this.args.operand.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => emitter.emitWasmRuntimeFunctionCall("catnip_math_round", true));
    }
}