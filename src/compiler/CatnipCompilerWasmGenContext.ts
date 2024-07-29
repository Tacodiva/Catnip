import { SpiderExpression, SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipIrFunction, CatnipIrValueType } from './CatnipIrFunction';
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../ir/CatnipIrOp";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { createLogger, Logger } from "../log";
import { CatnipWasmStructThread } from "../wasm-interop/CatnipWasmStructThread";
import { CatnipCommandOpType, CatnipInputOpType } from "../ir";
import { CatnipInputFormat } from "../ir/types";
import { CatnipWasmEnumValueFlags, CatnipWasmStructValue } from "../wasm-interop/CatnipWasmStructValue";

export interface CatnipCompilerWasmLocal {
    ref: SpiderLocalVariableReference,
    type: SpiderNumberType
}

export class CatnipCompilerWasmGenContext {
    public static readonly logger: Logger = createLogger("CatnipCompilerWasmGenContext");

    public readonly compiler: CatnipCompiler;
    public get projectModule() { return this.compiler.module; }
    public get spiderModule() { return this.projectModule.spiderModule; }
    public get runtimeModule() { return this.projectModule.runtimeModule; }

    public get project() { return this.compiler.project; }

    private _func: CatnipIrFunction;
    public get func() { return this._func; }

    private _expressionNullable: SpiderExpression | null;
    private _expressions: SpiderExpression[];

    private get _expression(): SpiderExpression {
        CatnipCompilerWasmGenContext.logger.assert(
            this._expressionNullable !== null,
            true, "No expression to write to."
        );

        return this._expressionNullable;
    }

    private _locals: Map<SpiderNumberType, CatnipCompilerWasmLocal[]>;
    private _unreleaseLocals: number;

    public constructor(func: CatnipIrFunction) {
        this.compiler = func.compiler;
        this._func = func;
        this._expressionNullable = null;
        this._expressions = [];
        this.pushExpression(this._func.spiderFunction.body);

        this._locals = new Map();
        this._unreleaseLocals = 0;

        if (this._func.stackSize !== 0) {
            // TODO optimize
            for (const [value, variable] of this._func.localVariables) {
                if (variable.type !== CatnipIrValueType.STACK)
                    continue;

                this.emitWasmGetStackPtr();

                switch (value.type) {
                    case SpiderNumberType.i32:
                        this.emitWasmConst(SpiderNumberType.i32, variable.stackOffset - this._func.stackSize);
                        this.emitWasm(SpiderOpcodes.i32_add);
                        this.emitWasm(SpiderOpcodes.i32_load, 2, 0);
                        break;
                    default:
                        CatnipCompilerWasmGenContext.logger.assert(
                            false,
                            true, "Unsupported stack value type."
                        );
                }

                this.emitWasm(SpiderOpcodes.local_set, variable.ref);
            }
        }
    }

    public pushExpression(expr?: SpiderExpression) {
        if (this._expressionNullable !== null) {
            this._expressions.push(this._expressionNullable);
        } else {
            CatnipCompilerWasmGenContext.logger.assert(this._expressions.length === 0);
        }
        this._expressionNullable = expr ?? new SpiderExpression();
    }

    public popExpression(): SpiderExpression {
        const expression = this._expressionNullable;
        CatnipCompilerWasmGenContext.logger.assert(this._expressions.length !== 0);
        this._expressionNullable = this._expressions.pop() ?? null;
        return expression!;
    }

    public emitBranch(branch: CatnipIrBranch): SpiderExpression {
        this.pushExpression();
        this.emitBranchInline(branch);
        return this.popExpression();
    }

    public emitBranchInline(branch: CatnipIrBranch) {
        if (branch.isFuncBody) {
            const targetFunc = branch.func;

            this.prepareStackForCall(targetFunc, branch.isYielding());

            this.emitWasmGetThread();

            for (const parameter of targetFunc.parameters) {
                this.emitWasm(SpiderOpcodes.local_get, this._func.getValueVariableRef(parameter.value));
            }

            this.emitWasm(SpiderOpcodes.call, targetFunc.spiderFunction);

            if (branch.isYielding()) {
                this.emitWasm(SpiderOpcodes.return);
            }

        } else {
            CatnipCompilerWasmGenContext.logger.assert(
                branch.func === this._func,
                true, "Branch must be a part of the current function or a function body."
            );

            this.emitOps(branch);
        }
    }

    public emitOps(branch: CatnipIrBranch) {
        for (const op of branch.ops) this.emitOp(op, branch);
    }

    public emitOp(op: CatnipIrOp, branch: CatnipIrBranch) {
        const opType = op.type;

        if (opType instanceof CatnipIrInputOpType) {
            const inputOp = op as CatnipIrInputOp;
            opType.generateWasm(this, inputOp, branch);

            const srcFormat = opType.getOutputFormat(inputOp);
            const dstFormat = inputOp.format;

            if (srcFormat !== dstFormat) {

                function notSupported(): never {
                    throw new Error(`Conversion from ${srcFormat} -> ${dstFormat} not supported.`);
                }

                switch (srcFormat) {
                    case CatnipInputFormat.VALUE_PTR: {
                        const getF64 = () => {
                            const local = this.createLocal(SpiderNumberType.i32);
                            this.emitWasm(SpiderOpcodes.local_tee, local.ref);
                            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("flags"));
                            this.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_DOUBLE);
                            this.emitWasm(SpiderOpcodes.i32_and);

                            // Executed if the VAL_DOUBLE flag is set
                            this.pushExpression();
                            this.emitWasm(SpiderOpcodes.local_get, local.ref);
                            this.emitWasm(SpiderOpcodes.f64_load, 3, CatnipWasmStructValue.getMemberOffset("val_double"));
                            const trueExpr = this.popExpression();

                            // Executed if the VAL_STRING flag not is set
                            this.pushExpression();
                            this.emitWasm(SpiderOpcodes.local_get, local.ref);
                            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("val_string"));
                            this.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                            const falseExpr = this.popExpression();

                            this.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.f64);
                            this.releaseLocal(local);
                        }

                        const getHString = () => {
                            const local = this.createLocal(SpiderNumberType.i32);
                            this.emitWasm(SpiderOpcodes.local_tee, local.ref);
                            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("flags"));
                            this.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_STRING);
                            this.emitWasm(SpiderOpcodes.i32_and);

                            // Executed if the VAL_STRING flag is set
                            this.pushExpression();
                            this.emitWasm(SpiderOpcodes.local_get, local.ref);
                            this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("val_string"));
                            this.emitWasm(SpiderOpcodes.local_tee, local.ref);
                            this.emitWasmRuntimeFunctionCall("catnip_hstring_ref");
                            this.emitWasm(SpiderOpcodes.local_get, local.ref);
                            const trueExpr = this.popExpression();

                            // Executed if the VAL_STRING flag not is set
                            this.pushExpression();
                            this.emitWasm(SpiderOpcodes.local_get, local.ref);
                            this.emitWasm(SpiderOpcodes.f64_load, 3, CatnipWasmStructValue.getMemberOffset("val_double"));
                            this.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                            const falseExpr = this.popExpression();

                            this.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                            this.releaseLocal(local);
                        };

                        switch (dstFormat) {
                            case CatnipInputFormat.f64: {
                                // value* -> f64
                                getF64();
                                break;
                            }

                            case CatnipInputFormat.HSTRING_PTR: {
                                // value* -> hstring*
                                getHString();
                                break;
                            }
                            default: notSupported();
                        }
                        break;
                    }
                    case CatnipInputFormat.f64: {
                        switch (dstFormat) {
                            case CatnipInputFormat.HSTRING_PTR: {
                                // f64 -> hstring*
                                this.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                                break;
                            }
                            default: notSupported();
                        }
                        break;
                    }
                    default: notSupported();
                }
            }

        } else {
            CatnipCompilerWasmGenContext.logger.assert(
                opType instanceof CatnipIrCommandOpType
            );
            const commandOp = op as CatnipIrCommandOp;
            opType.generateWasm(this, commandOp, branch);
        }

    }

    // TODO This will leak memory :c
    public alloateHeapString(str: string): number {
        return this.runtimeModule.allocateHeapString(str);
    }

    public emitWasmConst(type: SpiderNumberType, value: number): void {
        this._expression.emitConstant(type, value);
    }

    public emitWasm<T extends any[]>(opcode: SpiderOpcode<T>, ...args: T): void {
        this._expression.emit(opcode, ...args);
    }

    public emitWasmRuntimeFunctionCall(funcName: CatnipRuntimeModuleFunctionName) {
        this.emitWasm(SpiderOpcodes.call, this.projectModule.getRuntimeFunction(funcName));
    }

    public emitWasmGetThread() {
        this.emitWasm(SpiderOpcodes.local_get, this.func.spiderThreadParam);
    }

    public emitWasmGetStackPtr() {
        this.emitWasm(SpiderOpcodes.local_get, this.func.spiderThreadParam);
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
    }

    public emitWasmGetStackEnd() {
        this.emitWasm(SpiderOpcodes.local_get, this.func.spiderThreadParam);
        this.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("stack_end"));
    }

    public prepareStackForCall(targetFunc: CatnipIrFunction, tailCall: boolean) {
        // TODO optimize
        if (tailCall) {
            if (this._func.stackSize !== 0) {
                this.emitWasmGetThread();

                this.emitWasmGetStackPtr();
                this.emitWasmConst(SpiderNumberType.i32, this._func.stackSize);
                this.emitWasm(SpiderOpcodes.i32_sub);

                this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
            }
        }

        if (targetFunc.stackSize !== 0) {
            this.emitWasmGetStackEnd();

            this.emitWasmGetStackPtr();
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize);
            this.emitWasm(SpiderOpcodes.i32_add);

            this.emitWasm(SpiderOpcodes.i32_lt_u);

            this.pushExpression();
            this.emitWasmGetThread();
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize);
            this.emitWasmRuntimeFunctionCall("catnip_thread_resize_stack");
            this.emitWasm(SpiderOpcodes.if, this.popExpression());

            for (const [value, variable] of targetFunc.localVariables) {
                if (variable.type !== CatnipIrValueType.STACK)
                    continue;

                this.emitWasmGetStackPtr();
                this.emitWasm(SpiderOpcodes.local_get, this._func.getValueVariableRef(value));

                switch (value.type) {
                    case SpiderNumberType.i32:
                        this.emitWasm(SpiderOpcodes.i32_store, 2, variable.stackOffset);
                        break;
                    default:
                        CatnipCompilerWasmGenContext.logger.assert(
                            false,
                            true, "Unsupported stack value type."
                        );
                }
            }

            this.emitWasmGetThread();

            this.emitWasmGetStackPtr();
            this.emitWasmConst(SpiderNumberType.i32, targetFunc.stackSize);
            this.emitWasm(SpiderOpcodes.i32_add);

            this.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));
        }
    }

    public createLocal(type: SpiderNumberType): CatnipCompilerWasmLocal {
        ++this._unreleaseLocals;

        const locals = this._locals.get(type);

        if (locals === undefined || locals.length === 0) {
            return { ref: this.func.spiderFunction.addLocalVariable(type), type };
        } else {
            return locals.pop()!;
        }
    }

    public releaseLocal(local: CatnipCompilerWasmLocal) {
        --this._unreleaseLocals;

        let locals = this._locals.get(local.type);

        if (locals === undefined) {
            locals = [];
            this._locals.set(local.type, locals);
        }

        locals.push(local);
    }

}
