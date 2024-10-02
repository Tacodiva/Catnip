import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript, CatnipScriptID } from "../runtime/CatnipScript";
import { CatnipProjectModule, CatnipProjectModuleEvent } from "./CatnipProjectModule";
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
import { compileModule, createModule, SpiderElementFuncIdxActive, SpiderExportFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderNumberType, SpiderOpcodes, SpiderReferenceType, SpiderTypeDefinition } from "wasm-spider";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipSprite, CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipProcedureID, procedure_trigger, procedure_trigger_inputs } from "../ops/procedure/procedure_definition";
import { CatnipIrScriptProcedureTrigger, ir_procedure_trigger, ir_procedure_trigger_inputs } from "./ir/procedure/procedure_trigger";
import { CatnipEventID, ir_event_trigger, ir_event_trigger_inputs } from "./ir/core/event_trigger";
import { CatnipCompilerSubsystem, CatnipCompilerSubsystemClass } from "./CatnipCompilerSubsystem";
import { CatnipCommandList } from "../ops";

export class CatnipCompiler {
    public readonly project: CatnipProject;
    public get runtimeModule() { return this.project.runtimeModule; }

    public readonly config: Readonly<CatnipCompilerConfig>;

    private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;

    public readonly spiderModule: SpiderModule;
    public readonly spiderMemory: SpiderImportMemory;
    public readonly spiderIndirectFunctionTable: SpiderImportTable;
    public readonly spiderIndirectFunctionType: SpiderTypeDefinition;
    private readonly _spiderFunctionNop: SpiderFunctionDefinition;

    private readonly _runtimeFuncs: ReadonlyMap<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;
    private readonly _subsystems: Map<CatnipCompilerSubsystemClass, CatnipCompilerSubsystem>;

    private readonly _scripts: Map<CatnipSpriteID, Map<CatnipScriptID, CatnipIr>>;

    private readonly _freeFunctionTableIndices: number[];
    private _functionTableIndexCount: number;

    private _exportCount: number;

    constructor(project: CatnipProject, config?: CatnipCompilerConfig) {
        this.project = project;
        this.config = config ? { ...config } : catnipCreateDefaultCompilerConfig();
        this._passes = new Map();

        this.addPass(PreLoopPassAnalyzeFunctionCallers);

        if (this.config.enable_optimization_variable_inlining)
            this.addPass(LoopPassVariableInlining);

        this.addPass(PreWasmPassTransientVariablePropagation);
        this.addPass(PreWasmPassFunctionIndexAllocation);

        this.spiderModule = createModule();
        this.spiderMemory = this.spiderModule.importMemory("env", "memory");
        this.spiderIndirectFunctionTable = this.spiderModule.importTable(
            "env", "indirect_function_table",
            SpiderReferenceType.funcref, 0
        );
        this.spiderIndirectFunctionType = this.spiderModule.createType(
            [SpiderNumberType.i32]
        );
        this._spiderFunctionNop = this.spiderModule.createFunction();

        const runtimeFuncs = new Map();
        this._runtimeFuncs = runtimeFuncs;

        let funcName: CatnipRuntimeModuleFunctionName;
        for (funcName in CatnipRuntimeModuleFunctions) {
            const func = CatnipRuntimeModuleFunctions[funcName];
            const funcType = this.spiderModule.createType(func.args, ...(func.result === undefined ? [] : [func.result]));
            runtimeFuncs.set(funcName, this.spiderModule.importFunction("catnip", funcName, funcType));
        }

        this._scripts = new Map();

        this._freeFunctionTableIndices = [];
        this._functionTableIndexCount = 1; // Starts at 1 because we never allocate function table index 0
        this._exportCount = 0;

        this._subsystems = new Map();
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

    private *_enumerateScripts(): IterableIterator<CatnipIr> {
        for (const spriteScripts of this._scripts.values()) {
            yield* spriteScripts.values();
        }
    }

    public addScript(script: CatnipScript): void {
        const ir = new CatnipIr(this, script);

        let spriteScripts = this._scripts.get(ir.spriteID);

        if (spriteScripts === undefined) {
            spriteScripts = new Map();
            this._scripts.set(ir.spriteID, spriteScripts);
        }

        if (spriteScripts.has(ir.scriptID))
            this.removeScript(ir.spriteID, ir.scriptID);

        spriteScripts.set(ir.scriptID, ir);
    }

    public removeScript(spriteID: CatnipSpriteID, scriptID: CatnipScriptID) {
        throw new Error("Not supported.");
    }

    _createCommandIR(ir: CatnipIr) {
        ir.createCommandIR();

        this._runPass(ir, CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_PRE_WASM_GEN);

        console.log("" + ir);
    }

    public async createModule(): Promise<CatnipProjectModule> {

        for (const scriptIR of this._enumerateScripts()) {
            if (!scriptIR.hasCommandIR)
                this._createCommandIR(scriptIR);

            scriptIR.createWASM();
        }

        const eventFunctions = this._createEventFunctions();
        const functionsElement = this._createFunctionsElement();

        const module = await compileModule(this.spiderModule);

        const instance = await WebAssembly.instantiate(module, {
            env: {
                memory: this.runtimeModule.imports.env.memory,
                indirect_function_table: this.runtimeModule.indirectFunctionTable
            },
            catnip: this.runtimeModule.functions
        });

        const events: CatnipProjectModuleEvent[] = [];
        for (const [id, eventInfo] of eventFunctions)
            events.push({ id, exportName: eventInfo.export.name });

        const projectModule = new CatnipProjectModule(this.project, instance, events);

        this._deleteEventFunctions(eventFunctions);
        this._deleteFunctionsElement(functionsElement);

        return projectModule;
    }

    private _createFunctionsElement(): SpiderElementFuncIdxActive {
        const spiderFns: SpiderFunctionDefinition[] = new Array(this._functionTableIndexCount);
        spiderFns.fill(this._spiderFunctionNop);

        for (const ir of this._enumerateScripts()) {
            for (const func of ir.functions) {
                if (func.hasFunctionTableIndex) {
                    CatnipCompilerLogger.assert(spiderFns[func.functionTableIndex] === this._spiderFunctionNop);
                    spiderFns[func.functionTableIndex] = func.spiderFunction;
                }
            }
        }

        return this.spiderModule.createElementFuncIdxActive(
            this.spiderIndirectFunctionTable, 0, spiderFns
        );
    }

    private _deleteFunctionsElement(element: SpiderElementFuncIdxActive) {
        this.spiderModule.elements.splice(this.spiderModule.elements.indexOf(element), 1);
    }

    private _createEventFunctions(): Map<CatnipEventID, { func: SpiderFunctionDefinition, export: SpiderExportFunction }> {
        const eventFunctions: Map<CatnipEventID, { func: SpiderFunctionDefinition, export: SpiderExportFunction }> = new Map();
        const eventMap: Map<CatnipEventID, { ir: CatnipIr, priority: number }[]> = new Map();

        for (const ir of this._enumerateScripts()) {
            if (ir.trigger.type === ir_event_trigger) {
                const inputs = ir.trigger.inputs as ir_event_trigger_inputs;
                const eventID = inputs.id;
                let listeners = eventMap.get(eventID);

                if (listeners === undefined) {
                    listeners = [];
                    eventMap.set(eventID, listeners);
                }

                listeners.push({ ir, priority: inputs.priority });
            }
        }

        for (const list of eventMap.values())
            list.sort((a, b) => a.priority - b.priority);

        for (const [event, listeners] of eventMap) {

            const eventFunc = this.spiderModule.createFunction();
            const eventExport = this.spiderModule.exportFunction(this._allocateExportName(event), eventFunc);
            eventFunctions.set(event, { func: eventFunc, export: eventExport });

            const runtimePtrVarRef = eventFunc.addParameter(SpiderNumberType.i32);
            const threadListPtrVarRef = eventFunc.addParameter(SpiderNumberType.i32);

            for (const listener of listeners) {

                const sprite = this.project.getSprite(listener.ir.spriteID)!;
                const spritePtr = sprite.structWrapper.ptr;
                const entrypointPtr = listener.ir.entrypoint.functionTableIndex;

                eventFunc.body.emit(SpiderOpcodes.local_get, runtimePtrVarRef);
                eventFunc.body.emitConstant(SpiderNumberType.i32, spritePtr);
                eventFunc.body.emitConstant(SpiderNumberType.i32, entrypointPtr);
                eventFunc.body.emit(SpiderOpcodes.local_get, threadListPtrVarRef);
                eventFunc.body.emit(SpiderOpcodes.call, this.getRuntimeFunction("catnip_runtime_start_threads"));
            }
        }

        return eventFunctions;
    }

    private _deleteEventFunctions(functions: Map<CatnipEventID, { func: SpiderFunctionDefinition, export: SpiderExportFunction }>) {
        for (const eventInfo of functions.values()) {
            this.spiderModule.exports.splice(this.spiderModule.exports.indexOf(eventInfo.export), 1);
            this.spiderModule.functions.splice(this.spiderModule.functions.indexOf(eventInfo.func), 1);
        }
    }

    public getRuntimeFunction(funcName: CatnipRuntimeModuleFunctionName): SpiderImportFunction {
        const func = this._runtimeFuncs.get(funcName);
        if (func === undefined) throw new Error(`Unknown runtime function '${funcName}'.`);
        return func;
    }

    public allocateFunctionTableIndex(): number {
        if (this._freeFunctionTableIndices.length !== 0)
            return this._freeFunctionTableIndices.pop()!;

        return this._functionTableIndexCount++;
    }

    public freeFunctionTableIndex(idx: number) {
        this._freeFunctionTableIndices.push(idx);
    }

    private _allocateExportName(name: string): string {
        return name + "_" + (this._exportCount++);
    }

    public getSubsystem<
        TClass extends CatnipCompilerSubsystemClass<TSubsystem>,
        TSubsystem extends CatnipCompilerSubsystem =
        TClass extends CatnipCompilerSubsystemClass<infer I> ? I : never
    >(subsystemClass: TClass): TSubsystem {
        const mapSubsystem = this._subsystems.get(subsystemClass);

        if (mapSubsystem !== undefined)
            return mapSubsystem as TSubsystem;

        const newSubsystem = new subsystemClass(this);
        this._subsystems.set(subsystemClass, newSubsystem);

        return newSubsystem;
    }

}