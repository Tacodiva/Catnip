import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompilerStack, CatnipCompilerValue } from "./CatnipCompilerStack";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";

export class CatnipCompilerState {
    public readonly stack: CatnipCompilerStack;

    private _variables: Map<CatnipVariable, CatnipCompilerValue>;
    private _transientVariable: Map<CatnipIrTransientVariable, CatnipCompilerValue>;

    public constructor(clone?: CatnipCompilerState) {
        if (clone === undefined) {
            this.stack = new CatnipCompilerStack();
            this._variables = new Map();
            this._transientVariable = new Map();
        } else {
            this.stack = clone.stack.clone();
            this._variables = new Map(clone._variables);
            this._transientVariable = new Map(clone._transientVariable);
        }
    }

    public clone(): CatnipCompilerState {
        return new CatnipCompilerState(this);
    }

    public or(other: CatnipCompilerState) {
        
    }

    public getVariableValue(variable: CatnipVariable): CatnipCompilerValue {
        let value = this._variables.get(variable);

        if (value === undefined) {
            value = { isConstant: false, format: CatnipValueFormat.F64 }
        }

        return value;
    }

    public setVariableValue(variable: CatnipVariable, value: CatnipCompilerValue) {
        if (!CatnipValueFormatUtils.isAlways(value.format, CatnipValueFormat.F64)) {
            value = {
                ...value,
                format: CatnipValueFormat.F64
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