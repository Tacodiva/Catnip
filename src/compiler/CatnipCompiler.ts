import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipProjectModule } from "./CatnipProjectModule";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { ir_thread_terminate } from "./ir/core/thread_terminate";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipCompilerConfig } from "./CatnipCompilerConfig";
import { CatnipIr, CatnipReadonlyIr } from "./CatnipIr";
import { CatnipCompilerPass } from "./passes/CatnipCompilerPass";
import { LoopPassVariableInlining } from "./passes/LoopPassVariableInlining";
import { PostLoopPassFunctionIndexAllocation } from "./passes/PostLoopPassFunctionIndexAllocation";
import { CatnipCompilerPassStage, CatnipCompilerStage } from "./CatnipCompilerStage";
import { PreLoopPassAnalyzeFunctionCallers } from "./passes/PreLoopPassAnalyzeFunctionCallers";
import { CatnipCompilerState } from './CatnipCompilerState';
import { PostLoopPassTransientVariablePropagation } from "./passes/PostLoopPassTransientVariablePropagation";

export class CatnipCompiler {
    public readonly project: CatnipProject;
    public readonly module: CatnipProjectModule;
    public readonly config: CatnipCompilerConfig;

    private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;

    public get spiderModule() { return this.module.spiderModule; }

    constructor(project: CatnipProject, config: CatnipCompilerConfig) {
        this.project = project;
        this.config = config;
        this.module = new CatnipProjectModule(this.project.runtimeModule);
        this._passes = new Map();

        this.addPass(PreLoopPassAnalyzeFunctionCallers);

        this.addPass(LoopPassVariableInlining);
        
        this.addPass(PostLoopPassTransientVariablePropagation);
        this.addPass(PostLoopPassFunctionIndexAllocation);
    }

    public addPass(pass: CatnipCompilerPass) {
        const stage = pass.stage;
        let passes = this._passes.get(stage);

        if (passes === undefined) {
            passes = [];
            this._passes.set(stage, passes);
        }

        passes.push(pass);
        passes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }

    private _runPass(ir: CatnipReadonlyIr, stage: CatnipCompilerPassStage) {
        for (const pass of this._passes.get(stage) ?? []) {
            pass.run(ir);
        }
    }

    public compile(script: CatnipScript) {
        const ir = new CatnipIr(this);
        const irGenCtx = new CatnipCompilerIrGenContext(ir);

        irGenCtx.emitCommands(script.commands);
        irGenCtx.emitIr(ir_thread_terminate, {}, {});

        this._runPass(ir, CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP);
        
        console.log(""+ir);

        for (const func of irGenCtx.ir.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitOps(func.body);
        }

        this.spiderModule.exportFunction("testFunction", ir.entrypoint.spiderFunction);
    }
}