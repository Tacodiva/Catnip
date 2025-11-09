import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrPushExternalValue } from "../../ir1/core/IR1InstrPushExternalValue";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1ExternalValue, IR1ExternalValueType } from "../../ir1/IR1ExternalValue";
import { IR0Input } from "../IR0Node";
import { CatnipValue } from "../../CatnipValue";

export class IR0InputProcedureArgument extends IR0Input {

    public readonly index: number;

    public constructor(index: number) {
        super("procedure_argument", {});
        this.index = index;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.F64);
    }

    private _getExternalValue(): IR1ExternalValue {
        return {
            type: IR1ExternalValueType.PROCEDURE_ARGUMENT,
            index: this.index
        };
    }

    public getExternalValues(): IR1ExternalValue[] {
        return [this._getExternalValue()];
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrPushExternalValue(this._getExternalValue());
    }

    public clone() {
        return new IR0InputProcedureArgument(this.index);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} #${this.index}"]`;
    }
}