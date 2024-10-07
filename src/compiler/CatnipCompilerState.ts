import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipCompilerValue } from "./CatnipCompilerValue";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";

export class CatnipCompilerState {

    private readonly _variables: Map<CatnipVariable, CatnipCompilerValue>;

    public constructor(clone?: CatnipCompilerState) {
        if (clone === undefined) {
            this._variables = new Map();
        } else {
            this._variables = new Map(clone._variables);
        }
    }

    public clone(): CatnipCompilerState {
        return new CatnipCompilerState(this);
    }

    private *_enumerateVariables(other: CatnipCompilerState): IterableIterator<CatnipVariable> {
        yield* this._variables.keys();
        for (const variable of other._variables.keys()) {
            if (!this._variables.has(variable))
                yield variable;
        }
    }

    public isSubsetOf(other: CatnipCompilerState): boolean {
        for (const variable of this._enumerateVariables(other)) {
            const thisType = this.getVariableValue(variable);
            const otherType = other.getVariableValue(variable);

            if (!thisType.isSubsetOf(otherType))
                return false;
        }

        return true;
    }

    public or(other: CatnipCompilerState): CatnipCompilerState {
        const newState = new CatnipCompilerState();

        for (const variable of this._enumerateVariables(other)) {
            const thisType = this.getVariableValue(variable);
            const otherType = other.getVariableValue(variable);

            newState._variables.set(variable, thisType.or(otherType));
        }

        return newState;
    }

    public getVariableValue(variable: CatnipVariable): CatnipCompilerValue {
        let value = this._variables.get(variable);

        if (value === undefined)
            value = CatnipCompilerValue.dynamic(CatnipValueFormat.F64);

        return value;
    }

    public setVariableValue(variable: CatnipVariable, value: CatnipCompilerValue) {
        CatnipCompilerLogger.assert(
            CatnipValueFormatUtils.isAlways(value.format, CatnipValueFormat.F64),
            true, "Cannot set variable to non-F64 type."
        );

        this._variables.set(variable, value);
    }
}