import { CatnipValueFlags, CatnipValueFormat } from "./types";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompilerReadonlyStack, CatnipCompilerStack, CatnipCompilerValue, CatnipCompilerValueType } from "./CatnipCompilerStack";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";

export class CatnipCompilerState {
    public readonly stack: CatnipCompilerStack;

    private _variables: Map<CatnipVariable, CatnipCompilerValue>;
    private _transientVariable: Map<CatnipIrTransientVariable, CatnipCompilerValue>;

    public constructor() {
        this.stack = new CatnipCompilerStack();
        this._variables = new Map();
        this._transientVariable = new Map();
    }

    public getVariableValue(variable: CatnipVariable): CatnipCompilerValue {
        let value = this._variables.get(variable);

        if (value === undefined) {
            value = { type: CatnipCompilerValueType.DYNAMIC, flags: CatnipValueFlags.ANY, format: CatnipValueFormat.VALUE_PTR }
        }

        return value;
    }

    public setVariableValue(variable: CatnipVariable, value: CatnipCompilerValue) {
        if (value.format !== CatnipValueFormat.VALUE_PTR) {
            value = {
                ...value,
                format: CatnipValueFormat.VALUE_PTR
            };
        }

        this._variables.set(variable, value);
    }

    public getTransientValue(variable: CatnipIrTransientVariable): CatnipCompilerValue {
        let value = this._transientVariable.get(variable);

        if (value === undefined)
            throw new Error("No value for transient.");

        return value;
    }

    public setTransientValue(variable: CatnipIrTransientVariable, value: CatnipCompilerValue) {
        if (value.format !== variable.format)
            throw new Error("Cannot set transient. Wrong format.");

        this._transientVariable.set(variable, value);
    }
}