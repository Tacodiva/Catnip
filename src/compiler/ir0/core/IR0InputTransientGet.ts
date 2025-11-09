import { CatnipCompilerTransientVariable } from "../../CatnipCompilerTransientVariable";
import { CatnipValue } from "../../CatnipValue";
import { IR1InstrPushExternalValue } from "../../ir1/core/IR1InstrPushExternalValue";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1ExternalValue, IR1ExternalValueType } from "../../ir1/IR1ExternalValue";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputTransientGet extends IR0Input {

    public transient: CatnipCompilerTransientVariable;
    public result: CatnipValue;

    public constructor(transient: CatnipCompilerTransientVariable) {
        super("transient_get", {});
        this.transient = transient;
        this.result = CatnipValue.dynamic(this.transient.format);
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

    public getResult(): CatnipValue {
        return this.result;
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction {
        return new IR1InstrPushExternalValue(this._getExternalValue());
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.transient.name}'"]`;
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputTransientGet(ctx.getTransient(this.transient));
    }
}