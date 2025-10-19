import { CatnipCompilerTransientVariable } from "../../CatnipCompilerTransientVariable";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrPushExternalValue } from "../../ir1/core/IR1InstrPushExternalValue";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1ExternalValue, IR1ExternalValueType } from "../../ir1/IR1ExternalValue";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0Input } from "../IR0Node";

export class IR0InputTransientGet extends IR0Input {

    public transient: CatnipCompilerTransientVariable;

    public constructor(transient: CatnipCompilerTransientVariable) {
        super("transient_get", {});
        this.transient = transient;
    }

    private _getExternalValue(): IR1ExternalValue {
        return {
            type: IR1ExternalValueType.TRANSIENT_VARIABLE,
            var: this.transient
        };
    }

    public getExternalValues(): IR1ExternalValue[] {
        return [this._getExternalValue()];
    }

    public getResultFormat(): CatnipValueFormat {
        return this.transient.format;
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction {
        return new IR1InstrPushExternalValue(this._getExternalValue());
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.transient.name}'"]`;
    }
}