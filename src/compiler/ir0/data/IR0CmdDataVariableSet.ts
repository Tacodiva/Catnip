import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrDataVariableSet } from "../../ir1/data/IR1InstrDataVariableSet";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdDataVariableSet extends IR0Command<["value"]> {

    public readonly target: CatnipTarget;
    public readonly variable: CatnipVariable;

    public constructor(target: CatnipTarget, variable: CatnipVariable, value: IR0Input) {
        super("data_var_set", { value: { value, format: CatnipValueFormat.F64 } });
        this.target = target;
        this.variable = variable;
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction {
        return new IR1InstrDataVariableSet(this.target, this.variable);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} '${this.variable.name}'"]`;
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdDataVariableSet(this.target, this.variable, this.args.value.input.clone(ctx));
    }
}