import { SpiderExpression, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipIrFunction } from './CatnipIrFunction';
import { CatnipIrOp } from "../ir/CatnipIrOp";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { createLogger, Logger } from "../log";

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

    public constructor(func: CatnipIrFunction) {
        this.compiler = func.compiler;
        this._func = func;
        this._expressionNullable = null;
        this._expressions = [];
        this.pushExpression(this._func.spiderFunction.body);
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
            this.emitWasmGetThread();
            this.emitWasm(SpiderOpcodes.call, branch.func.spiderFunction);

            if (branch.isYielding()) {
                this.emitWasm(SpiderOpcodes.return);
            }
        } else {
            CatnipCompilerWasmGenContext.logger.assert(
                branch.func === this._func,
                true, "Branch must be a part of the current function or a function body."
            );

            this.emitOps(branch.ops);
        }

    }

    public emitOps(ops: CatnipIrOp[]) {
        for (const op of ops) this.emitOp(op);
    }

    public emitOp(head: CatnipIrOp) {
        head.type.generateWasm(this, head);
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

}
