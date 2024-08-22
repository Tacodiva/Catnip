import { SpiderFunction, SpiderFunctionDefinition, SpiderLocalReference, SpiderModule, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipIrBranch, CatnipReadonlyIrBranch } from "./CatnipIrBranch";
import { CatnipIr as CatnipIr, CatnipReadonlyIr } from "./CatnipIr";

/** How does a CatnipIrTransientValue get its value at the begining of a function */
export enum CatnipIrTransientVariableType {
    /** It has no initial value and is initialize by this function. */
    LOCAL,
    /** It is passed into this function as an argument. */
    PARAMETER,
    /** It is stored on the thread stack and read at the begining of the function. */
    STACK
}

interface TransientVariableInfoBase {
    variable: CatnipIrTransientVariable;
    ref: SpiderLocalReference;
    type: CatnipIrTransientVariableType;
}

interface TransientVariableStackInfo extends TransientVariableInfoBase {
    type: CatnipIrTransientVariableType.STACK;
    stackOffset: number;
}

interface TransientVariableParameterInfo extends TransientVariableInfoBase {
    type: CatnipIrTransientVariableType.PARAMETER;
}

interface TransientVariableLocalInfo extends TransientVariableInfoBase {
    type: CatnipIrTransientVariableType.LOCAL;
}

type TransientVariableInfo = TransientVariableStackInfo | TransientVariableParameterInfo | TransientVariableLocalInfo;

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
    useTransientVariable(variable: CatnipIrTransientVariable): void;
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

    private _transientVariables: Map<CatnipIrTransientVariable, TransientVariableInfo>;

    public get transientVariables(): IterableIterator<[CatnipIrTransientVariable, TransientVariableInfo]> {
        return this._transientVariables.entries();
    }

    private _stackSize: number;
    public get stackSize(): number { return this._stackSize; }

    // TODO Parameters should have a source and destination
    // Source could be a procedure parameter instead
    //  In that case, the transient variable is the destination, but not the source
    private _parameters: TransientVariableParameterInfo[];
    public get parameters(): ReadonlyArray<TransientVariableParameterInfo> { return this._parameters; }

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
        this._parameters = [];

        this._callers = new Set();
    }

    private _addLocalVariable(variable: TransientVariableInfo) {
        this._transientVariables.set(variable.variable, variable);

        if (variable.type === CatnipIrTransientVariableType.PARAMETER) {
            this._parameters.push(variable);
        }

        for (const caller of this._callers)
            caller.useTransientVariable(variable.variable);
    }

    public createTransientVariable(variable: CatnipIrTransientVariable) {
        CatnipCompilerLogger.assert(
            !this._transientVariables.has(variable),
            true, "Local variable already created for value. Value may be being read or written to before it's initialized."
        );

        this._addLocalVariable({
            variable: variable,
            ref: this.spiderFunction.addLocalVariable(variable.type),
            type: CatnipIrTransientVariableType.LOCAL
        });
    }

    public useTransientVariable(variable: CatnipIrTransientVariable) {
        if (this._transientVariables.has(variable))
            return;

        if (this.needsFunctionTableIndex) {
            this._addLocalVariable({
                variable: variable,
                ref: this.spiderFunction.addLocalVariable(variable.type),
                type: CatnipIrTransientVariableType.STACK,
                stackOffset: this._stackSize
            });

            this._stackSize += variable.size;
        } else {
            this._addLocalVariable({
                variable: variable,
                ref: this.spiderFunction.addParameter(variable.type),
                type: CatnipIrTransientVariableType.PARAMETER
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
            if (variable.type === CatnipIrTransientVariableType.LOCAL)
                continue;
            caller.useTransientVariable(value);
        }
    }

    public setFunctionTableIndex(index: number) {
        if (this._functionTableIndex !== -1)
            CatnipCompilerLogger.warn("Set function table index twice.");
        this._functionTableIndex = index;
    }
}