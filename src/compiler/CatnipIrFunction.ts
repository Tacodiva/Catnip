import { SpiderFunctionDefinition } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrOp } from "../ir/CatnipIrOp";

export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;

    public readonly head: CatnipIrOp;

    public constructor(compiler: CatnipCompiler, head: CatnipIrOp) {
        this.compiler = compiler;
        this.head = head;

        this.spiderFunction = this.spiderModule.createFunction();
    }
}