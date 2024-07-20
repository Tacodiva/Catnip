import { SpiderFunctionDefinition } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch, CatnipIrOp } from "../ir/CatnipIrOp";

export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;

    public readonly body: CatnipIrBranch;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.spiderFunction = this.spiderModule.createFunction();
        this.body = new CatnipIrBranch(this);
    }
}