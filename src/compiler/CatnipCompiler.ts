import { SpiderExpression, SpiderFunctionDefinition, SpiderModule, SpiderOpcode } from "wasm-spider";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipFunction } from "./CatnipFunction";
import { CatnipCommandOp, CatnipCommandOpType, CatnipInputOp, CatnipInputOpType, CatnipIrCommandList, CatnipOpInputs, CatnipOpType, CatnipOpTypes, CatnipInputFormat, CatnipInputFlags } from "../ir";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipProjectModule } from "./CatnipProjectModule";

/*

Compiler Stages:

Stage 1: Generate
    -> All the operations are converted to their IR counterpart
    -> The IR is split up into functions and linked together

Stage 2: Analyse
    -> Each section is analysed to get type information

Stage 3: Emit
    -> Each section is converted into WASM

*/

export class CatnipCompilerIrGenContext {
    public readonly compiler: CatnipCompiler;
    public readonly functions: CatnipFunction[];

    public catnipFunction: CatnipFunction;
    public commands: CatnipIrCommandList;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this.functions = [new CatnipFunction(this.compiler)];
        this.catnipFunction = this.functions[0];
        this.commands = this.catnipFunction.commandList;
    }

    public emitCommandIr<TIrInputs extends CatnipOpInputs>(op: CatnipCommandOpType<any, TIrInputs>, inputs: TIrInputs) {
        this.commands.commands.push({ type: op, inputs });
    }

    public emitInputIr<TIrInputs extends CatnipOpInputs>(op: CatnipInputOpType<any, TIrInputs>, inputs: TIrInputs, format: CatnipInputFormat, flags: CatnipInputFlags) {
        this.commands.commands.push({ type: op, inputs, format, flags });
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipInputFormat, flags: CatnipInputFlags) {
        op.type.generateIr(this, op.inputs, format, flags);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

}


/** @internal */
export class CatnipCompiler {

    public readonly project: CatnipProject;
    public readonly module: CatnipProjectModule;

    public get spiderModule() { return this.module.spiderModule; }

    constructor(project: CatnipProject) {
        this.project = project;
        this.module = new CatnipProjectModule(this.project.runtimeModule);
    }

    public compile(script: CatnipScript) {
        const irGenCtx = new CatnipCompilerIrGenContext(this);

        for (const command of script.commands)
            irGenCtx.emitCommand(command);

        for (const catnipFunction of irGenCtx.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(catnipFunction);

            for (const irOperation of catnipFunction.commandList.commands) {
                irOperation.type.generateWasm(wasmGenCtx, irOperation);
            }

            this.spiderModule.exportFunction("testFunction", wasmGenCtx.spiderFunction);
        }
    }


}