import { SpiderFunction, SpiderFunctionDefinition, SpiderLocalReference, SpiderModule, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipIrBranch, CatnipReadonlyIrBranch } from "./CatnipIrBranch";
import { CatnipIr as CatnipIr, CatnipReadonlyIr } from "./CatnipIr";

export interface CatnipIrTransientVariableSourceInfo {
    readonly variable: CatnipIrTransientVariable;
    readonly ref: SpiderLocalReference;
    readonly source: CatnipIrExternalValue | null;
}

export enum CatnipIrExternalLocationType {
    STACK,
    PARAMETER
}

export enum CatnipIrExternalValueSourceType {
    TRANSIENT_VARIABLE,
    PROCEDURE_INPUT,
}

export interface CatnipIrExternalValue {
    readonly location: CatnipIrExternalLocation;
    readonly value: CatnipIrExternalValueSource;
}

export interface CatnipIrExternalLocationStack {
    readonly type: CatnipIrExternalLocationType.STACK;
    readonly stackOffset: number;
}

export interface CatnipIrExternalLocationParameter {
    readonly type: CatnipIrExternalLocationType.PARAMETER;
}

export type CatnipIrExternalLocation = CatnipIrExternalLocationParameter | CatnipIrExternalLocationStack;

export interface CatnipIrExternalValueSourceTransientVariable {
    readonly type: CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE,
    readonly variable: CatnipIrTransientVariable
}

export interface CatnipIrExternalValueSourceProcedureInput {
    readonly type: CatnipIrExternalValueSourceType.PROCEDURE_INPUT
}

export type CatnipIrExternalValueSource = CatnipIrExternalValueSourceProcedureInput | CatnipIrExternalValueSourceTransientVariable;


export interface CatnipReadonlyIrFunction {
    readonly ir: CatnipReadonlyIr;
    readonly compiler: CatnipCompiler;
    readonly spiderModule: SpiderModule;
    readonly spiderFunction: SpiderFunctionDefinition;
    readonly spiderThreadParam: SpiderLocalReference;

    readonly body: CatnipReadonlyIrBranch;
    readonly name: string;

    readonly needsFunctionTableIndex: boolean;
    readonly functionTableIndex: number;

    registerCaller(caller: CatnipReadonlyIrFunction): void;
    setFunctionTableIndex(index: number): void;

    createTransientVariable(variable: CatnipIrTransientVariable): void;
    sourceExternalValue(source: CatnipIrExternalValueSource): void;
}

export class CatnipIrFunction implements CatnipReadonlyIrFunction {

    public readonly ir: CatnipIr;
    public get compiler(): CatnipCompiler { return this.ir.compiler; }
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalReference;

    public name: string;
    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;

    private _functionTableIndex: number;
    public get functionTableIndex(): number {
        if (this._functionTableIndex === -1)
            throw new Error("No function table index assigned.");
        return this._functionTableIndex;
    }

    private _transientVariables: Map<CatnipIrTransientVariable, CatnipIrTransientVariableSourceInfo>;

    public get transientVariables(): IterableIterator<CatnipIrTransientVariableSourceInfo> {
        return this._transientVariables.values();
    }

    private _stackSize: number;
    public get stackSize(): number { return this._stackSize; }

    private readonly _externalValues: CatnipIrExternalValue[];
    public get externalValues(): ReadonlyArray<CatnipIrExternalValue> {
        return this._externalValues;
    }

    private _callers: Set<CatnipIrFunction>;

    /** @internal */
    constructor(ir: CatnipIr, needsFunctionTableIndex: boolean, name: string, branch?: CatnipIrBranch) {
        this.ir = ir;
        this.spiderFunction = this.spiderModule.createFunction();
        this.spiderThreadParam = this.spiderFunction.addParameter(SpiderNumberType.i32);

        this.name = name;

        if (branch === undefined) {
            this.body = new CatnipIrBranch(this);
        } else {
            CatnipCompilerLogger.assert(
                !branch.isFuncBody,
                true, "Branch is already a function body."
            )
            this.body = branch;
            this.body.setFunction(this);
        }

        this.needsFunctionTableIndex = needsFunctionTableIndex;
        this._functionTableIndex = -1;

        this._transientVariables = new Map();
        this._stackSize = 0;
        this._externalValues = [];

        this._callers = new Set();
    }

    private _addLocalVariable(variable: CatnipIrTransientVariableSourceInfo) {
        this._transientVariables.set(variable.variable, variable);

        if (variable.source !== null) {
            this._externalValues.push(variable.source);

            for (const caller of this._callers)
                caller.sourceExternalValue(variable.source.value);
        }
    }

    public createTransientVariable(variable: CatnipIrTransientVariable) {
        CatnipCompilerLogger.assert(
            !this._transientVariables.has(variable),
            true, "Local variable already created for value. Value may be being read or written to before it's initialized."
        );

        this._addLocalVariable({
            variable: variable,
            ref: this.spiderFunction.addLocalVariable(variable.type),
            source: null
        });
    }

    public sourceExternalValue(source: CatnipIrExternalValueSource) {

        if (source.type === CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE) {
            if (this._transientVariables.has(source.variable))
                return;

            if (this.needsFunctionTableIndex) {
                this._addLocalVariable({
                    variable: source.variable,
                    ref: this.spiderFunction.addLocalVariable(source.variable.type),
                    source: {
                        value: {
                            type: CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE,
                            variable: source.variable,
                        },
                        location: {
                            type: CatnipIrExternalLocationType.STACK,
                            stackOffset: this._stackSize,
                        },
                    }
                });

                this._stackSize += source.variable.size;
            } else {
                this._addLocalVariable({
                    variable: source.variable,
                    ref: this.spiderFunction.addLocalVariable(source.variable.type),
                    source: {
                        value: {
                            type: CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE,
                            variable: source.variable,
                        },
                        location: {
                            type: CatnipIrExternalLocationType.PARAMETER,
                        },
                    }
                });
            }
        } else if (source.type === CatnipIrExternalValueSourceType.PROCEDURE_INPUT) {
            throw new Error("Not implemented.");
        }
    }

    public getTransientVariableRef(variable: CatnipIrTransientVariable): SpiderLocalReference {
        CatnipCompilerLogger.assert(
            this._transientVariables.has(variable),
            true, "Value not marked as used by function."
        );

        return this._transientVariables.get(variable)!.ref;
    }

    public registerCaller(caller: CatnipIrFunction) {
        if (this._callers.has(caller))
            return;

        this._callers.add(caller);

        for (const [value, variable] of this._transientVariables) {
            if (variable.source === null)
                continue;
            caller.sourceExternalValue(variable.source.value);
        }
    }

    public setFunctionTableIndex(index: number) {
        if (this._functionTableIndex !== -1)
            CatnipCompilerLogger.warn("Set function table index twice.");
        this._functionTableIndex = index;
    }
}