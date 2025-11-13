import { CatnipCompilerTransientVariable } from "../../CatnipCompilerTransientVariable";
import { IR1InstrSetExternalValue } from "../../ir1/core/IR1InstrSetExternalValue";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1ExternalValue, IR1ExternalValueType } from "../../ir1/IR1ExternalValue";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdTransientSet extends IR0Command<["value"]> {
    public transient: CatnipCompilerTransientVariable;

    public constructor(transient: CatnipCompilerTransientVariable, value: IR0Input) {
        super("transient_set", {
            value: {
                format: transient.format, value
            }
        });
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

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitInput(this.args.value);
        emitter.emitIR1(new IR1InstrSetExternalValue(this._getExternalValue()));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.transient.name}'"]`;
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdTransientSet(ctx.getTransient(this.transient), this.args.value.input.clone(ctx));
    }

}