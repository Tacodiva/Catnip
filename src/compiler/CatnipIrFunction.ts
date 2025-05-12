import { SpiderFunction, SpiderFunctionDefinition, SpiderLocalReference, SpiderModule, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipIr } from "./CatnipIr";
import { ir_procedure_trigger, ir_procedure_trigger_inputs } from "./ir/procedure/procedure_trigger";
import { CatnipSprite, CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";

export interface CatnipIrTransientVariableSourceInfo {
    readonly variable: CatnipIrTransientVariable;
    ref: SpiderLocalReference;
    readonly source: CatnipIrExternalValue | null;
}

export enum CatnipIrExternalLocationType {
    STACK,
    PARAMETER
}

export enum CatnipIrExternalValueSourceType {
    TRANSIENT_VARIABLE,
    PROCEDURE_INPUT,
    RETURN_LOCATION
}

export interface CatnipIrExternalValue {
    location: CatnipIrExternalLocation;
    value: CatnipIrExternalValueSource;
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
    readonly type: CatnipIrExternalValueSourceType.PROCEDURE_INPUT,
    readonly index: number;
}

export interface CatnipIrExternalValueSourceReturnLocation {
    readonly type: CatnipIrExternalValueSourceType.RETURN_LOCATION,
}

export type CatnipIrExternalValueSource = CatnipIrExternalValueSourceReturnLocation | CatnipIrExternalValueSourceProcedureInput | CatnipIrExternalValueSourceTransientVariable;

export class CatnipIrFunction {

    public readonly ir: CatnipIr;
    public get compiler(): CatnipCompiler { return this.ir.compiler; }
    public get spiderModule(): SpiderModule { return this.compiler.spiderModule; }
    public get project(): CatnipProject { return this.compiler.project; }
    public get spriteID(): CatnipSpriteID { return this.ir.spriteID; }
    public get sprite(): CatnipSprite { return this.project.getSprite(this.spriteID); }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalReference;

    public name: string;
    public readonly body: CatnipIrBasicBlock;

    private _hasFunctionTableIndex: boolean;

    public get hasFunctionTableIndex(): boolean {
        return this._hasFunctionTableIndex;
    }

    private _functionTableIndex: number;
    public get functionTableIndex(): number {
        if (!this._hasFunctionTableIndex)
            throw new Error("No function table index assigned.");
        return this._functionTableIndex;
    }

    private _transientVariables: Map<CatnipIrTransientVariable, CatnipIrTransientVariableSourceInfo>;

    public get transientVariables(): IterableIterator<Readonly<CatnipIrTransientVariableSourceInfo>> {
        return this._transientVariables.values();
    }

    private _stackSize: number;
    public get stackSize(): number { return this._stackSize; }

    private readonly _externalValues: CatnipIrExternalValue[];
    public get externalValues(): readonly Readonly<CatnipIrExternalValue>[] {
        return this._externalValues;
    }

    private readonly _parameters: CatnipIrExternalValueSource[];
    public get parameters(): readonly Readonly<CatnipIrExternalValueSource>[] {
        return this._parameters;
    }

    private _callers: Set<CatnipIrFunction>;

    public get isEntrypoint(): boolean { return this.ir.entrypoint === this; }

    /** @internal */
    constructor(ir: CatnipIr, name: string, branch?: CatnipIrBasicBlock) {
        this.ir = ir;
        this.spiderFunction = this.spiderModule.createFunction();

        // console.log(`${name} => ${this.spiderModule.functions.indexOf(this.spiderFunction)}`)
        this.spiderThreadParam = this.spiderFunction.addParameter(SpiderNumberType.i32);

        this.name = name;

        if (branch === undefined) {
            this.body = new CatnipIrBasicBlock(this);
        } else {
            CatnipCompilerLogger.assert(
                !branch.isFuncBody,
                true, "Branch is already a function body."
            )
            this.body = branch;
            this.body.setFunction(this);
        }

        this._hasFunctionTableIndex = false;
        this._functionTableIndex = -1;

        this._transientVariables = new Map();
        this._stackSize = 0;
        this._externalValues = [];
        this._parameters = [];

        this._callers = new Set();
    }

    private _addLocalVariable(variable: CatnipIrTransientVariableSourceInfo) {
        this._transientVariables.set(variable.variable, variable);

        if (variable.source !== null) {
            this._externalValues.push(variable.source);

            if (variable.source.location.type === CatnipIrExternalLocationType.PARAMETER)
                this._parameters.push(variable.source.value);

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
        if (source.type !== CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE)
            throw new Error("Can only propagate transient variables.");

        if (this._transientVariables.has(source.variable))
            return;

        let valueSource: CatnipIrExternalValueSource;

        if (this.isEntrypoint) {            
            if (this.ir.hasReturnLocation && source.variable === this.ir.returnLocationVariable) {
                valueSource = {
                    type: CatnipIrExternalValueSourceType.RETURN_LOCATION
                }
            } else {
                const trigger = this.ir.trigger;

                if (trigger.type !== ir_procedure_trigger) throw new Error("Can only source arguments from procedures.");
                const triggerInputs = trigger.inputs as ir_procedure_trigger_inputs;

                const procedureArgIdx = triggerInputs.args.findIndex(arg => arg.variable === source.variable);

                if (procedureArgIdx === -1) throw new Error("Cannot source transient from entrypoint.");

                valueSource = {
                    type: CatnipIrExternalValueSourceType.PROCEDURE_INPUT,
                    index: procedureArgIdx
                };
            }
        } else {
            valueSource = {
                type: CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE,
                variable: source.variable,
            };
        }

        if (this._hasFunctionTableIndex) {
            this._addLocalVariable({
                variable: source.variable,
                ref: this.spiderFunction.addLocalVariable(source.variable.type),
                source: {
                    value: valueSource,
                    location: {
                        type: CatnipIrExternalLocationType.STACK,
                        stackOffset: this._stackSize,
                    },
                }
            });

            this._stackSize += 8;
        } else {
            this._addLocalVariable({
                variable: source.variable,
                ref: this.spiderFunction.addParameter(source.variable.type),
                source: {
                    value: valueSource,
                    location: {
                        type: CatnipIrExternalLocationType.PARAMETER,
                    },
                }
            });
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
            if (variable.source === null || variable.source.value.type !== CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE)
                continue;
            caller.sourceExternalValue(variable.source.value);
        }
    }

    public assignFunctionTableIndex() {
        if (this._hasFunctionTableIndex) {
            CatnipCompilerLogger.warn("Already allocated a function table index.");
            return;
        }

        this._hasFunctionTableIndex = true;
        this._functionTableIndex = this.compiler.allocateFunctionTableIndex();

        for (const varInfo of this._transientVariables.values()) {
            if (varInfo.source === null) continue;
            if (varInfo.source.location.type === CatnipIrExternalLocationType.PARAMETER) {

                this.spiderFunction.type.spliceParameters(varInfo.ref.index, 1);
                this._parameters.splice(this.parameters.indexOf(varInfo.source.value), 1);

                varInfo.source.location = {
                    type: CatnipIrExternalLocationType.STACK,
                    stackOffset: this.stackSize
                };
                this._stackSize += 8;

                varInfo.ref = this.spiderFunction.addLocalVariable(varInfo.variable.type);
            }
        }
    }
}