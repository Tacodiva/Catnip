import { SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { NumericLiteral } from "typescript";
import { CatnipIrVariable } from "./CatnipIrVariable";
import { ir_load_value, ir_load_value_inputs } from "../ir/ops/core/load_value";
import { ir_store_value, ir_store_value_inputs } from "../ir/ops/core/store_value";

/** How does a CatnipIrValue get its value at the begining of a function */
export enum CatnipIrValueType {
    /** It has no initial value and is initialize by this function. */
    LOCAL,
    /** It is passed into this function as an argument. */
    PARAMETER,
    /** It is stored on the thread stack. */
    STACK
}

interface CatnipLocalVariableBase {
    value: CatnipIrVariable;
    ref: SpiderLocalVariableReference;
    type: CatnipIrValueType;
}

interface CatnipLocalVariableStack extends CatnipLocalVariableBase {
    type: CatnipIrValueType.STACK;
    stackOffset: number;
}

interface CatnipLocalVariableParameter extends CatnipLocalVariableBase {
    type: CatnipIrValueType.PARAMETER;
}

interface CatnipLocalVariableLocal extends CatnipLocalVariableBase {
    type: CatnipIrValueType.LOCAL;
}

export type CatnipLocalVariable = CatnipLocalVariableStack | CatnipLocalVariableParameter | CatnipLocalVariableLocal;


export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalVariableReference;

    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;
    public functionTableIndex: number;

    private _localVariables: Map<CatnipIrVariable, CatnipLocalVariable>;

    public get localVariables(): IterableIterator<[CatnipIrVariable, CatnipLocalVariable]> {
        return this._localVariables.entries();
    }

    private _stackSize: number;
    public get stackSize(): number { return this._stackSize; }

    private _parameters: CatnipLocalVariableParameter[];
    public get parameters(): ReadonlyArray<CatnipLocalVariableParameter> { return this._parameters; }

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

        this._localVariables = new Map();
        this._stackSize = 0;
        this._parameters = [];

        this._callers = new Set();
    }

    private _addLocalVariable(variable: CatnipLocalVariable) {
        this._localVariables.set(variable.value, variable);

        if (variable.type === CatnipIrValueType.PARAMETER) {
            this._parameters.push(variable);

        }

        for (const caller of this._callers)
            caller.useLocalVariable(variable.value);
    }

    public createLocalVariable(value: CatnipIrVariable) {
        CatnipCompilerLogger.assert(
            !this._localVariables.has(value),
            true, "Local variable already created for value. Value may be being read or written to before it's initialized."
        );

        this._addLocalVariable({
            value,
            ref: this.spiderFunction.addLocalVariable(value.type),
            type: CatnipIrValueType.LOCAL
        });
    }

    public useLocalVariable(value: CatnipIrVariable) {
        if (this._localVariables.has(value))
            return;

        if (this.needsFunctionTableIndex) {
            this._addLocalVariable({
                value,
                ref: this.spiderFunction.addLocalVariable(value.type),
                type: CatnipIrValueType.STACK,
                stackOffset: this._stackSize
            });

            this._stackSize += value.size;
        } else {
            this._addLocalVariable({
                value,
                ref: this.spiderFunction.addParameter(value.type),
                type: CatnipIrValueType.PARAMETER
            });
        }
    }

    public getValueVariableRef(value: CatnipIrVariable): SpiderLocalVariableReference {
        CatnipCompilerLogger.assert(
            this._localVariables.has(value),
            true, "Value not marked as used by function."
        );

        return this._localVariables.get(value)!.ref;
    }

    public registerCaller(caller: CatnipIrFunction) {
        if (this._callers.has(caller))
            return;

        this._callers.add(caller);

        for (const [value, variable] of this._localVariables) {
            if (variable.type === CatnipIrValueType.LOCAL)
                continue;
            caller.useLocalVariable(value);
        }
    }
}