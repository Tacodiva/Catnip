import { SpiderFunctionDefinition, SpiderLocalVariableReference, SpiderNumberType } from "wasm-spider";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";

export class CatnipIrFunction {

    public readonly compiler: CatnipCompiler;
    public get spiderModule() { return this.compiler.spiderModule; }

    public readonly spiderFunction: SpiderFunctionDefinition;
    public readonly spiderThreadParam: SpiderLocalVariableReference;

    public readonly body: CatnipIrBranch;

    public needsFunctionTableIndex: boolean;
    public functionTableIndex: number;

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
    }
}