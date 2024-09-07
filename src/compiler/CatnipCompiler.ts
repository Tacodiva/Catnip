import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipEventID, CatnipScript } from "../runtime/CatnipScript";
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
import { CatnipReadonlyIrFunction } from "./CatnipIrFunction";
import { compileModule, createModule, SpiderElementFuncIdxActive, SpiderExportFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderNumberType, SpiderOpcodes, SpiderReferenceType } from "wasm-spider";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipSprite } from "../runtime/CatnipSprite";
import { CatnipWasmStructSprite } from "../wasm-interop/CatnipWasmStructSprite";
import { CatnipWasmStructTarget } from "../wasm-interop/CatnipWasmStructTarget";

export class CatnipCompiler {
    public readonly project: CatnipProject;
    public get runtimeModule() { return this.project.runtimeModule; }

    public readonly config: Readonly<CatnipCompilerConfig>;

    private readonly _passes: Map<CatnipCompilerPassStage, CatnipCompilerPass[]>;

    public readonly spiderModule: SpiderModule;
    public readonly spiderMemory: SpiderImportMemory;
    public readonly spiderIndirectFunctionTable: SpiderImportTable;
    private readonly _spiderFunctionElement: SpiderElementFuncIdxActive;
    private readonly _spiderFunctionNop: SpiderFunctionDefinition;

    private readonly _runtimeFuncs: Map<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;
    private readonly _compiledFuncs: Map<CatnipScript, CatnipIr>;
    private readonly _eventFunctions: Map<CatnipEventID, { func: SpiderFunctionDefinition, export: SpiderExportFunction }>;

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
        this._spiderFunctionElement = this.spiderModule.createElementFuncIdxActive(
            this.spiderIndirectFunctionTable, 0, []
        );
        this._spiderFunctionNop = this.spiderModule.createFunction();

        this._runtimeFuncs = new Map();

        let funcName: CatnipRuntimeModuleFunctionName;
        for (funcName in CatnipRuntimeModuleFunctions) {
            const func = CatnipRuntimeModuleFunctions[funcName];
            const funcType = this.spiderModule.createType(func.args, ...(func.result === undefined ? [] : [func.result]));
            this._runtimeFuncs.set(funcName, this.spiderModule.importFunction("catnip", funcName, funcType));
        }

        this._compiledFuncs = new Map();

        this._freeFunctionTableIndices = [];
        this._functionTableIndexCount = 1; // Starts at 1 because we never allocate function table index 0
        this._exportCount = 0;

        this._eventFunctions = new Map();
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

    public compileScript(script: CatnipScript) {
        const ir = new CatnipIr(this, "main");
        const irGenCtx = new CatnipCompilerIrGenContext(ir);

        irGenCtx.emitCommands(script.commands);
        irGenCtx.emitIr(ir_barrier, {}, {});
        irGenCtx.emitIr(ir_thread_terminate, {}, {});

        this._runPass(ir, CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP);
        this._runPass(ir, CatnipCompilerStage.PASS_PRE_WASM_GEN);

        console.log("" + ir);

        for (const func of ir.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitOps(func.body);
        }

        this._compiledFuncs.set(script, ir);

        this.spiderModule.exportFunction("testFunction", ir.entrypoint.spiderFunction);
    }

    public removeScript(script: CatnipScript) {
        throw new Error("Not supported.");
    }

    public async createModule(): Promise<CatnipProjectModule> {
        this._updateFunctionsElement();
        this._updateEventFunctions();

        const module = await compileModule(this.spiderModule);

        const instance = await WebAssembly.instantiate(module, {
            env: {
                memory: this.runtimeModule.imports.env.memory,
                indirect_function_table: this.runtimeModule.indirectFunctionTable
            },
            catnip: this.runtimeModule.functions
        });

        const events: CatnipProjectModuleEvent[] = [];
        for (const [id, eventInfo] of this._eventFunctions)
            events.push({id, exportName: eventInfo.export.name });

        return new CatnipProjectModule(this.project, instance, events);
    }

    private _updateFunctionsElement() {
        const spiderFns: SpiderFunctionDefinition[] = new Array(this._functionTableIndexCount);
        spiderFns.fill(this._spiderFunctionNop);

        for (const ir of this._compiledFuncs.values()) {
            for (const func of ir.functions) {
                if (func.needsFunctionTableIndex) {
                    CatnipCompilerLogger.assert(spiderFns[func.functionTableIndex] === this._spiderFunctionNop);
                    spiderFns[func.functionTableIndex] = func.spiderFunction;
                }
            }
        }

        this._spiderFunctionElement.init = spiderFns;
    }

    private _updateEventFunctions() {
        // Delete any old event functions
        for (const eventInfo of this._eventFunctions.values()) {
            this.spiderModule.exports.splice(this.spiderModule.exports.indexOf(eventInfo.export), 1);
            this.spiderModule.functions.splice(this.spiderModule.functions.indexOf(eventInfo.func), 1);
        }
        this._eventFunctions.clear();

        const eventMap: Map<CatnipEventID, { ir: CatnipIr, script: CatnipScript, priority: number }[]> = new Map();

        for (const [script, ir] of this._compiledFuncs) {
            if (script.trigger.type === "event") {
                const eventID = script.trigger.event;
                let listeners = eventMap.get(eventID);

                if (listeners === undefined) {
                    listeners = [];
                    eventMap.set(eventID, listeners);
                }

                listeners.push({ ir, script, priority: script.trigger.priority ?? 0 });
            }
        }

        for (const list of eventMap.values())
            list.sort((a, b) => a.priority - b.priority);

        const spriteTargetOffset = CatnipWasmStructSprite.getMemberOffset("target");
        const nextTargetOffset = CatnipWasmStructTarget.getMemberOffset("next_sprite");

        for (const [event, listeners] of eventMap) {

            const eventFunc = this.spiderModule.createFunction();
            const eventExport = this.spiderModule.exportFunction(this._allocateExportName(event), eventFunc);
            this._eventFunctions.set(event, { func: eventFunc, export: eventExport });

            const runtimePtrVarRef = eventFunc.addParameter(SpiderNumberType.i32);
            const targetPtrVarRef = eventFunc.addLocalVariable(SpiderNumberType.i32);

            for (const listener of listeners) {

                const sprite = listener.script.sprite;
                const targetPtrPtr = sprite.structWrapper.ptr + spriteTargetOffset;

                // Load a pointer of the first target in the linked list
                eventFunc.body.emitConstant(SpiderNumberType.i32, targetPtrPtr);
                eventFunc.body.emit(SpiderOpcodes.i32_load, 2, 0);
                eventFunc.body.emit(SpiderOpcodes.local_set, targetPtrVarRef);

                eventFunc.body.emitBlock((block) => {
                    block.emitLoop((loop) => {
                        // Jump to the end of the block (outside the loop) if the pointer is null
                        loop.emit(SpiderOpcodes.local_get, targetPtrVarRef);
                        loop.emit(SpiderOpcodes.i32_eqz);
                        loop.emit(SpiderOpcodes.br_if, 2);

                        // Create the new thread
                        loop.emit(SpiderOpcodes.local_get, targetPtrVarRef);
                        loop.emitConstant(SpiderNumberType.i32, listener.ir.entrypoint.functionTableIndex);
                        loop.emit(SpiderOpcodes.call, this.getRuntimeFunction("catnip_thread_new"));
                        loop.emit(SpiderOpcodes.drop); // (Drop this thread for now)

                        // Load the pointer to the next target
                        loop.emit(SpiderOpcodes.local_get, targetPtrVarRef);
                        loop.emit(SpiderOpcodes.i32_load, 2, nextTargetOffset);
                        loop.emit(SpiderOpcodes.local_set, targetPtrVarRef);

                        // Jump to the top of the loop
                        loop.emit(SpiderOpcodes.br, 1);
                    });
                });
            }
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
}