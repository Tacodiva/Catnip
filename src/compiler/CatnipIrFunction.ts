import { SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch, CatnipIrOp } from "../ir/CatnipIrOp";

export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalVariableReference;

    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;
    public functionTableIndex: number;

    public constructor(compiler: CatnipCompiler, needsFunctionTableIndex: boolean) {
        this.compiler = compiler;
        this.spiderFunction = this.spiderModule.createFunction();
        this.spiderThreadParam = this.spiderFunction.addParameter(SpiderNumberType.i32);
        this.body = new CatnipIrBranch(this);
        this.needsFunctionTableIndex = needsFunctionTableIndex;
        this.functionTableIndex = 0;
    }
}