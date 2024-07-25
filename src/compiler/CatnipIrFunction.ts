import { SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { NumericLiteral } from "typescript";
import { CatnipIrValue } from "./CatnipIrValue";
import { ir_load_value, ir_load_value_inputs } from "../ir/ops/core/load_value";
import { ir_store_value, ir_store_value_inputs } from "../ir/ops/core/store_value";

/** How does a CatnipIrValue get its value at the begining of a function */
export enum CatnipIrValueType {
    /** It has no initial value and is initialize by this function. */
    LOCAL,
    /** It is passed into this function as an argument. */
    ARGUMENT,
    /** It is stored on the thread stack. */
    STACK
}

interface CatnipLocalVariableBase {
    ref: SpiderLocalVariableReference;
    type: CatnipIrValueType;
}

interface CatnipLocalVariableStack extends CatnipLocalVariableBase {
    type: CatnipIrValueType.STACK;
    stackOffset: number;
}

interface CatnipLocalVariableOther extends CatnipLocalVariableBase {
    type: CatnipIrValueType.ARGUMENT | CatnipIrValueType.LOCAL;
}

export type CatnipLocalVariable = CatnipLocalVariableStack | CatnipLocalVariableOther;


export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalVariableReference;

    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;
    public functionTableIndex: number;

    private _localVariables: Map<CatnipIrValue, CatnipLocalVariable>;

    public get localVariables(): IterableIterator<[CatnipIrValue, CatnipLocalVariable]> {
        return this._localVariables.entries();
    }

    private _stackSize: number;
    public get stackSize(): number { return this._stackSize; }

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
    }

    public createLocalVariable(value: CatnipIrValue) {
        CatnipCompilerLogger.assert(
            !this._localVariables.has(value),
            true, "Local variable already created for value. Value may be being read or written to before it's initialized."
        );

        this._localVariables.set(value, {
            ref: this.spiderFunction.addLocalVariable(value.type),
            type: CatnipIrValueType.LOCAL
        });
    }

    public useLocalVariable(value: CatnipIrValue) {
        if (this._localVariables.has(value))
            return;

        if (this.needsFunctionTableIndex) {
            this._localVariables.set(value, {
                ref: this.spiderFunction.addLocalVariable(value.type),
                type: CatnipIrValueType.STACK,
                stackOffset: this._stackSize
            });
            
            this._stackSize += value.size;
        } else {
            this._localVariables.set(value, {
                ref: this.spiderFunction.addParameter(value.type),
                type: CatnipIrValueType.ARGUMENT
            });
        }
    }

    public getValueVariableRef(value: CatnipIrValue): SpiderLocalVariableReference {
        CatnipCompilerLogger.assert(
            this._localVariables.has(value),
            true, "Value not marked as used by function."
        );

        return this._localVariables.get(value)!.ref;
    }
}