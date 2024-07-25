import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipProjectModule } from "./CatnipProjectModule";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { ir_thread_terminate } from "../ir/ops/core/thread_terminate";

export class CatnipCompiler {
    public readonly project: CatnipProject;
    public readonly module: CatnipProjectModule;

    public get spiderModule() { return this.module.spiderModule; }

    constructor(project: CatnipProject) {
        this.project = project;
        this.module = new CatnipProjectModule(this.project.runtimeModule);
    }

    public compile(script: CatnipScript) {

        const irFunc = new CatnipIrFunction(this, true);
        const irGenCtx = new CatnipCompilerIrGenContext(this, irFunc);

        irGenCtx.emitCommands(script.commands);
        irGenCtx.emitIrCommand(ir_thread_terminate, {}, {});

        this._allocateFunctionIndices(irGenCtx.functions);
        this.module.createFunctionsElement(irGenCtx.functions);
        
        for (const func of irGenCtx.functions)
            func.body.analyzePreEmit(new Set());
        
        console.log(irGenCtx.stringifyIr());

        for (const func of irGenCtx.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitOps(func.body);
        }

        this.spiderModule.exportFunction("testFunction", irFunc.spiderFunction);
    }

    private _allocateFunctionIndices(functions: CatnipIrFunction[]) {
        const needsFunctionIndices = functions.filter(fn => fn.needsFunctionTableIndex);
        let index = 1;

        for (const fn of needsFunctionIndices) {
            fn.functionTableIndex = index++;
        } 
    }

    // TODO This is a temporary crapy solution
    private takenIndices: Set<number> = new Set();
    private _allocateFunctionTableIndex(): number {
        for (let i = 1; i < 99999; i++) {
            if (!this.takenIndices.has(i) &&
                !this.module.runtimeModule.indirectFunctionTable.get(i)) {
                this.takenIndices.add(i);
                return i;
            }
        }
        throw new Error();
    }
}