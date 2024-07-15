import { SpiderExpression, SpiderFunctionDefinition, SpiderNumberType, SpiderOpcode, SpiderOpcodes } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipFunction } from "./CatnipFunction";
import { CatnipRuntimeModuleFunctionName } from "../runtime/CatnipRuntimeModuleFunctions";

export class CatnipCompilerWasmGenContext {
    public readonly compiler: CatnipCompiler;
    public get projectModule() { return this.compiler.module; }
    public get spiderModule() { return this.projectModule.spiderModule; }
    public get runtimeModule() { return this.projectModule.runtimeModule; }

    public get project() { return this.compiler.project; }
    
    public readonly catnipFunction: CatnipFunction;
    public spiderFunction: SpiderFunctionDefinition;

    public expression: SpiderExpression;
    
    public constructor(catnipFunction: CatnipFunction) {
        this.catnipFunction = catnipFunction;
        this.compiler = catnipFunction.compiler;

        this.spiderFunction = this.compiler.spiderModule.createFunction();
        this.expression = this.spiderFunction.body;
    }

    // TODO This will leak memory :c
    public alloateHeapString(str: string): number {
        return this.runtimeModule.allocateHeapString(str);
    }

    public emitConstant(type: SpiderNumberType, value: number): void {
        this.expression.emitConstant(type, value);
    }

    public emit<T extends any[]>(opcode: SpiderOpcode<T>, ...args: T): void {
        this.expression.emit(opcode, ...args);
    }
    
    public emitRuntimeFunctionCall(funcName: CatnipRuntimeModuleFunctionName) {
        this.expression.emit(SpiderOpcodes.call, this.projectModule.getRuntimeFunction(funcName));
    }

}
