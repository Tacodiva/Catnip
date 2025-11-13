import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataVariableGet } from "../../ir1/data/IR1InstrDataVariableGet";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";

export class IR0InputDataVariableGet extends IR0Input {

    public readonly target: CatnipTarget | null;
    public readonly variable: CatnipVariable;

    public result: CatnipValue;

    public constructor(target: CatnipTarget | null, variable: CatnipVariable) {
        super("data_var_get", {});
        this.target = target;
        this.variable = variable;
        this.result = CatnipValue.dynamic(CatnipValueFormat.F64);
    }

    public getResult(): CatnipValue {
        return this.result;
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitIR1(new IR1InstrDataVariableGet(this.target, this.variable));
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.variable.name}'"]`;
    }

    public clone() {
        return new IR0InputDataVariableGet(this.target, this.variable);
    }

}