import binaryen from "binaryen";
import { SpiderImportFunction } from "wasm-spider";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipProjectModule, CatnipProjectModuleEvent } from "../runtime/CatnipProjectModule";
import { CatnipCompilerConfig, catnipCompilerConfigPoppulate } from "./CatnipCompilerConfig";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipCompilerPassStage, CatnipCompilerStage } from "./CatnipCompilerStage";
import { CatnipCompilerModuleSubsystem, CatnipCompilerModuleSubsystemClass } from "./CatnipCompilerSubsystem";
import { CatnipIrExternalBranch } from "./CatnipIrBranch";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { IR0, IR0GraphVisDotGenerator, IR0Script } from "./ir0/IR0";
import { IR1 } from "./ir1/IR1";
import { IR1Emitter } from "./ir1/IR1Emitter";
import { IR1ToWasmInfo } from "./ir1/IR1ToWasmInfo";
import { LoopPassTypeAnalysis } from "./passes/analysis/AnalysisPassTypeAnalysis";
import { CatnipCompilerPass } from "./passes/CatnipCompilerPass";
import { PassVariableInlining } from "./passes/post-analysis/PassVariableInlining";
import { PassAnalyzeFunctionCallers } from "./passes/pre-analysis/PassAnalyzeFunctionCallers";
import { PassFunctionIndexAllocation } from "./passes/pre-analysis/PassFunctionIndexAllocation";
import { PassTransientVariablePropagation } from "./passes/pre-wasm/PassTransientVariablePropagation";
import { CatnipCompilerWasmEmitter } from "./wasm/CatnipCompilerWasmEmitter";
import { CatnipCompilerWasmModule } from "./wasm/CatnipCompilerWasmModule";

export interface CatnipIrPreAnalysis {
    isYielding: boolean;
    externalBranches: CatnipIrExternalBranch[];
}

export type catnip_compiler_callback = (...args: any[]) => void | number | string;
export type catnip_compiler_raw_callback = (...args: number[]) => void | number;

interface CallbackInfo {
    name: string;
    import: SpiderImportFunction;
    callback: catnip_compiler_raw_callback;
    argFormats: CatnipValueFormat[];
    returnFormat: CatnipValueFormat | null;
}

export class CatnipCompiler {

    public readonly project: CatnipProject;
    public get runtimeModule() { return this.project.runtimeModule; }
    public get runtimeInstance() { return this.project.runtimeInstance; }

    public readonly config: Readonly<CatnipCompilerConfig>;

    private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;
    private _stage: CatnipCompilerStage | null;

    public get stage() { return this._stage; }

    constructor(project: CatnipProject, config?: Partial<CatnipCompilerConfig>) {
        this.project = project;
        this.config = catnipCompilerConfigPoppulate(config);
        this._passes = new Map();
        this._stage = null;

        this.addPass(PassAnalyzeFunctionCallers);

        if (this.config.enable_optimization_variable_inlining)
            this.addPass(PassVariableInlining);

        if (this.config.enable_optimization_type_analysis)
            this.addPass(LoopPassTypeAnalysis)

        this.addPass(PassTransientVariablePropagation);
        this.addPass(PassFunctionIndexAllocation);
    }

    public addPass(pass: CatnipCompilerPass) {
        CatnipCompilerLogger.assert(this._stage === null);

        const stage = pass.stage;
        let passes = this._passes.get(stage);

        if (passes === undefined) {
            passes = [];
            this._passes.set(stage, passes);
        }

        passes.push(pass);
        passes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    }

    public assertStageBefore(arg: CatnipCompilerStage) {
        CatnipCompilerLogger.assert(this.stage !== null && this.stage < arg, true, `Invalid compiler stage.`);
    }

    public assertStage(arg: CatnipCompilerStage | CatnipCompilerStage[]) {
        if (Array.isArray(arg)) {
            for (const stage of arg) {
                if (this.stage === stage) return;
            }
            CatnipCompilerLogger.assert(false, true, `Invalid compiler stage.`);
        } else {
            CatnipCompilerLogger.assert(this.stage === arg, true, `Invalid compiler stage.`);
        }
    }

    private _transitionStage(stage: CatnipCompilerStage | null) {
        // TODO timing
        this._stage = stage;
    }

    public async createModule(): Promise<CatnipProjectModule> {
        this._transitionStage(CatnipCompilerStage.IR0_INIT);

        const ir0 = new IR0(this);

        for (const sprite of this.project.sprites) {
            for (const script of sprite.scripts) {
                new IR0Script(ir0, {
                    commands: script.commands,
                    scriptID: script.id,
                    spriteID: sprite.id,
                    trigger: script.trigger
                });
            }
        }

        this._transitionStage(CatnipCompilerStage.IR0_GEN);

        for (const script of ir0.scripts) {
            script.generateInstructions();
        }


        if (this.config.dump_ir0) {
            const graphVis = new IR0GraphVisDotGenerator();
            ir0.createGraphVis(graphVis);
            console.log(graphVis.toDotFile());
        }

        this._transitionStage(CatnipCompilerStage.IR0_TO_IR1_PREPASS);

        // TODO 

        this._transitionStage(CatnipCompilerStage.IR0_IR1_GEN);

        const ir1 = new IR1(this);

        for (const script of ir0.scripts) {
            new IR1Emitter(script, ir1).emitAll();
        }

        if (this.config.dump_ir1) {
            console.log(ir1.stringify());
        }

        this._transitionStage(CatnipCompilerStage.IR1_TO_WASM_PREPASS);

        const module = new CatnipCompilerWasmModule(this);
        const ir1ToWasmPrepass = new IR1ToWasmInfo(ir1, module);

        this._transitionStage(CatnipCompilerStage.IR1_WASM_GEN);

        for (const script of ir1.scripts) {
            for (const func of script.functions) {
                const emitter = new CatnipCompilerWasmEmitter(ir1ToWasmPrepass, func);

                if (func === script.entrypoint) {
                    emitter.emitTriggerEntry(script.trigger);
                }

                emitter.emitInstructions(func.body);
                emitter.finish();
            }
        }

        this._transitionStage(CatnipCompilerStage.MODULE_PREWRITE);

        module.preWrite();

        this._transitionStage(CatnipCompilerStage.MODULE_WRITE);

        module.spiderModule.exportFunction("test", ir1ToWasmPrepass.getSpiderFunction(ir1.scripts[0].functions[0]));

        let moduleSource = module.write();

        this._transitionStage(CatnipCompilerStage.MODULE_BINARYEN_OPTIMIZE);

        if (this.config.enable_optimization_binaryen || this.config.dump_binaryen) {
            const binaryenModule = binaryen.readBinary(moduleSource);

            if (this.config.enable_optimization_binaryen) {
                const optLevel = typeof (this.config.enable_optimization_binaryen) === "number" ?
                    this.config.enable_optimization_binaryen : 4;

                binaryen.setOptimizeLevel(optLevel);
                binaryenModule.optimize();
                moduleSource = binaryenModule.emitBinary();
            }

            if (this.config.dump_binaryen) {
                switch (this.config.dump_binaryen) {
                    case "wat":
                        console.log(binaryenModule.emitText());
                        break;
                    case "as":
                        console.log(binaryenModule.emitAsmjs());
                        break;
                    case "stack":
                        console.log(binaryenModule.emitStackIR());
                        break;
                }
            }
        }

        this._transitionStage(CatnipCompilerStage.MODULE_INSTANTIATE);

        const wasmModule = await WebAssembly.compile(moduleSource as BufferSource);

        const wasmInstance = await WebAssembly.instantiate(wasmModule, {
            env: {
                memory: this.runtimeModule.imports.env.memory,
                indirect_function_table: this.runtimeModule.indirectFunctionTable
            },
            catnip: this.runtimeModule.functions,
            catnip_callbacks: module.getCallbacks()
        });

        const wasmEvents: CatnipProjectModuleEvent[] = module.getEvents().map(wasmEvent => ({
            id: wasmEvent.id,
            jsTrigger: wasmInstance.exports[wasmEvent.funcExport.name] as Function,
            jsListeners: wasmEvent.jsListenerInfo?.listenersArray ?? null
        }));

        const projectModule = new CatnipProjectModule(this.project, wasmInstance, wasmEvents);

        this._transitionStage(null);

        return projectModule;
    }
}