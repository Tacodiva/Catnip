import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipProjectModule } from "./CatnipProjectModule";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { ir_thread_terminate } from "./ir/core/thread_terminate";
import { CatnipCompilerConfig, catnipCreateDefaultCompilerConfig } from "./CatnipCompilerConfig";
import { CatnipIr, CatnipReadonlyIr } from "./CatnipIr";
import { CatnipCompilerPass } from "./passes/CatnipCompilerPass";
import { LoopPassVariableInlining } from "./passes/PostLoopPassVariableInlining";
import { PreWasmPassFunctionIndexAllocation } from "./passes/PreWasmPassFunctionIndexAllocation";
import { CatnipCompilerPassStage, CatnipCompilerStage } from "./CatnipCompilerStage";
import { PreLoopPassAnalyzeFunctionCallers } from "./passes/PreLoopPassAnalyzeFunctionCallers";
import { PreWasmPassTransientVariablePropagation } from "./passes/PreWasmPassTransientVariablePropagation";
import { ir_barrier } from "./ir/core/barrier";

export class CatnipCompiler {
    public readonly project: CatnipProject;
    public readonly module: CatnipProjectModule;
    public readonly config: Readonly<CatnipCompilerConfig>;

    private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;

    public get spiderModule() { return this.module.spiderModule; }

    constructor(project: CatnipProject, config?: CatnipCompilerConfig) {
        this.project = project;
        this.config = config ? {...config} : catnipCreateDefaultCompilerConfig();
        this.module = new CatnipProjectModule(this.project.runtimeModule);
        this._passes = new Map();

        this.addPass(PreLoopPassAnalyzeFunctionCallers);

        if (this.config.enable_optimization_variable_inlining) this.addPass(LoopPassVariableInlining);
        
        this.addPass(PreWasmPassTransientVariablePropagation);
        this.addPass(PreWasmPassFunctionIndexAllocation);
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
        const ir = new CatnipIr(this, "main");
        const irGenCtx = new CatnipCompilerIrGenContext(ir);

        irGenCtx.emitCommands(script.commands);
        irGenCtx.emitIr(ir_barrier, {}, {});
        irGenCtx.emitIr(ir_thread_terminate, {}, {});

        this._runPass(ir, CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_PRE_WASM_GEN);
        
        console.log(""+ir);

        for (const func of irGenCtx.ir.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitOps(func.body);
        }

        this.spiderModule.exportFunction("testFunction", ir.entrypoint.spiderFunction);
    }
}