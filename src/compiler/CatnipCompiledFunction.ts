import { SpiderFunctionDefinition } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";

export class CatnipCompiledFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;

        this.spiderFunction = this.spiderModule.createFunction();
    }
}