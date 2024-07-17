import { SpiderExpression, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompiledFunction } from './CatnipCompiledFunction';
import { CatnipIrOp } from "../ir/CatnipIrOp";

export class CatnipCompilerWasmGenerator {
    public readonly compiler: CatnipCompiler;

    public currentFunction: CatnipCompiledFunction | null;

    public constructor(compoiler: CatnipCompiler) {
        this.compiler = compoiler;
        this.currentFunction = null;
    }



}

export class CatnipCompilerWasmGenContext {
    public readonly compiler: CatnipCompiler;
    public get projectModule() { return this.compiler.module; }
    public get spiderModule() { return this.projectModule.spiderModule; }
    public get runtimeModule() { return this.projectModule.runtimeModule; }

    public get project() { return this.compiler.project; }

    private _expression: SpiderExpression;

    public constructor(compiler: CatnipCompiler, expression: SpiderExpression) {
        this.compiler = compiler;
        this._expression = expression;
    }

    public emitBranch(branch: CatnipIrOp, expression?: SpiderExpression) {

        const oldExpression = this._expression;
        if (expression !== undefined) {
            this._expression = expression;
        }

        // "inline" branches are branches that are only called from one place
        // "block" branches are branches that are only called from places in the same function before the branch destination
        //   -> In this case we wrap everything from the first jump to the start of the branch in a "block" and use br / br_if
        // "loop" branches are branches that are only called from places in the same function after the branch destination
        //   -> In this case we wrap everything from the start of the branch to the last jump to it in a "loop" and use br / br_if
        // "function" branches are everything else
        //   -> We create a function and use call to jump to it

        if (branch.prev.length <= 1) {
            // Inline branch

            let next: CatnipIrOp | undefined = branch;
            while (next !== undefined && next.prev.length <= 1) {
                this.emitIr(next);
                next = next.branches.next;
            }

            if (next !== undefined)
                throw new Error();


        } else throw new Error();

        this._expression = oldExpression;

        return null!;
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
