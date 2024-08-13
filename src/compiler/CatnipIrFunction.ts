import { SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipIrBranch } from "./CatnipIrBranch";

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
    ref: SpiderLocalVariableReference;
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


export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalVariableReference;

    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;
    public functionTableIndex: number;

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

    public constructor(compiler: CatnipCompiler, needsFunctionTableIndex: boolean, branch?: CatnipIrBranch) {
        this.compiler = compiler;
        this.spiderFunction = this.spiderModule.createFunction();
        this.spiderThreadParam = this.spiderFunction.addParameter(SpiderNumberType.i32);

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
        this.functionTableIndex = 0;

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

    public getTransientVariableRef(variable: CatnipIrTransientVariable): SpiderLocalVariableReference {
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
}