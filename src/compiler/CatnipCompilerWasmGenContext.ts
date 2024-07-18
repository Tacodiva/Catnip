import { SpiderExpression, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipIrFunction } from './CatnipIrFunction';
import { CatnipIrCallType, CatnipIrOp } from "../ir/CatnipIrOp";
import { createLogger, Logger } from "../log";

export class CatnipCompilerWasmGenerator {
    public readonly compiler: CatnipCompiler;

    public currentFunction: CatnipIrFunction | null;

    public constructor(compoiler: CatnipCompiler) {
        this.compiler = compoiler;
        this.currentFunction = null;
    }



}

export class CatnipCompilerWasmGenContext {
    private static readonly _logger: Logger = createLogger("CatnipCompilerWasmGenContext");

    public readonly compiler: CatnipCompiler;
    public get projectModule() { return this.compiler.module; }
    public get spiderModule() { return this.projectModule.spiderModule; }
    public get runtimeModule() { return this.projectModule.runtimeModule; }

    public get project() { return this.compiler.project; }

    private _func: CatnipIrFunction;

    private _expressionNullable: SpiderExpression | null;
    private _expressions: SpiderExpression[];

    private get _expression(): SpiderExpression {
        CatnipCompilerWasmGenContext._logger.assert(this._expressionNullable !== null, true, "No expression to write to.");
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
            CatnipCompilerWasmGenContext._logger.assert(this._expressions.length === 0);
        }
        this._expressionNullable = expr ?? new SpiderExpression();
    }

    public popExpression(): SpiderExpression {
        const expression = this._expressionNullable;
        CatnipCompilerWasmGenContext._logger.assert(this._expressions.length !== 0);
        this._expressionNullable = this._expressions.pop() ?? null;
        return expression!;
    }

    public emitBranchExpression(head: CatnipIrOp) {
        this.pushExpression();
        this.emitBranch(head);
        return this.popExpression();
    }

    public emitBranch(head: CatnipIrOp) {
        //     CatnipCompilerWasmGenContext._logger.assert(head.callType !== undefined);

        //     let op: CatnipIrOp | undefined = head;

        //     while (op !== undefined && op.callType === CatnipIrCallType.Inline) {
        //         this.emitIr(op);
        //         op = op.branches.next;
        //     }

        //     if (op === undefined) return;

        //     throw new Error();

        let op: CatnipIrOp | undefined = head;

        while (op !== undefined) {
            this.emitIr(op);
            op = op.branches.next;
        }
    }

    public emitIr(head: CatnipIrOp) {
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
        this._expression.emit(SpiderOpcodes.call, this.projectModule.getRuntimeFunction(funcName));
    }

}
