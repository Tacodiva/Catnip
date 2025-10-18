import binaryen from "binaryen";
import { SpiderImportFunction } from "wasm-spider";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipProjectModule, CatnipProjectModuleEvent } from "../runtime/CatnipProjectModule";
import { CatnipCompilerConfig, catnipCompilerConfigPoppulate } from "./CatnipCompilerConfig";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipCompilerStage } from "./CatnipCompilerStage";
import { CatnipIrExternalBranch } from "./CatnipIrBranch";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { IR0 } from "./ir0/IR0";
import { IR0GraphVisDotGenerator } from "./ir0/IR0GraphVisDotGenerator";
import { IR0Script } from "./ir0/IR0Script";
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
import { SB3ToIR0Info } from "./ir0/SB3ToIR0Info";
import { IR0Emitter } from "./ir0/IR0Emitter";
import { IR0ToIR1Info } from "./ir0/IR0ToIR1Info";

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

    // private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;
    private _stage: CatnipCompilerStage | null;

    public get stage() { return this._stage; }

    constructor(project: CatnipProject, config?: Partial<CatnipCompilerConfig>) {
        this.project = project;
        this.config = catnipCompilerConfigPoppulate(config);
        // this._passes = new Map();
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
        // CatnipCompilerLogger.assert(this._stage === null);

        // const stage = pass.stage;
        // let passes = this._passes.get(stage);

        // if (passes === undefined) {
        //     passes = [];
        //     this._passes.set(stage, passes);
        // }

        // passes.push(pass);
        // passes.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
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
        if (this.config.enable_compiler_timing) {
            if (this._stage !== null)
                console.timeEnd(CatnipCompilerStage[this._stage]);

            if (stage !== null)
                console.time(CatnipCompilerStage[stage]);
        }

        this._stage = stage;
    }

    public async createModule(): Promise<CatnipProjectModule> {
        if (this.config.enable_compiler_timing) {
            console.time("COMPILE");
        }

        this._transitionStage(CatnipCompilerStage.SB3_IR0_PREPASS);

        const ir0 = new IR0(this);
        const sb3ToIR0 = new SB3ToIR0Info(this.project, ir0);

        sb3ToIR0.create();

        this._transitionStage(CatnipCompilerStage.SB3_IR0_GEN);

        for (const ir0Script of ir0.scripts) {
            const emitter = new IR0Emitter(sb3ToIR0, ir0Script);
            emitter.emitAll();
        }

        let graphVisGenerator: IR0GraphVisDotGenerator;

        if (this.config.dump_ir0) {
            graphVisGenerator = new IR0GraphVisDotGenerator();
            ir0.createGraphVis(graphVisGenerator);

            if (this.config.dump_ir0 === "basic")
                console.log(ir0.createGraphVis());
        }

        this._transitionStage(CatnipCompilerStage.IR0_IR1_PREPASS);

        const ir1 = new IR1(this);
        const ir0ToIR1 = new IR0ToIR1Info(ir0, ir1);

        ir0ToIR1.create();

        if (this.config.dump_ir0 === "advanced") {
            ir0ToIR1.addGraphVisDominanceEdges(graphVisGenerator!);
            console.log(graphVisGenerator!.toDotFile());
        }

        this._transitionStage(CatnipCompilerStage.IR0_IR1_GEN);

        for (const script of ir0.scripts) {
            const emitter = new IR1Emitter(script, ir0ToIR1);


            emitter.emitAll();
        }

        if (this.config.dump_ir1)
            console.log(ir1.stringify());

        this._transitionStage(CatnipCompilerStage.IR1_WASM_PREPASS);

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

        if (this.config.enable_compiler_timing) {
            console.timeEnd("COMPILE");
        }

        return projectModule;
    }
}