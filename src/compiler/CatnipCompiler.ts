import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipScript, CatnipScriptID } from "../runtime/CatnipScript";
import { CatnipProjectModule, CatnipProjectModuleEvent } from "./CatnipProjectModule";
import { CatnipCompilerConfig, catnipCreateDefaultCompilerConfig } from "./CatnipCompilerConfig";
import { CatnipIr, CatnipReadonlyIr } from "./CatnipIr";
import { CatnipCompilerPass } from "./passes/CatnipCompilerPass";
import { LoopPassVariableInlining } from "./passes/PostAnalysisPassVariableInlining";
import { PreWasmPassFunctionIndexAllocation } from "./passes/PreWasmPassFunctionIndexAllocation";
import { CatnipCompilerPassStage, CatnipCompilerStage } from "./CatnipCompilerStage";
import { PreLoopPassAnalyzeFunctionCallers } from "./passes/PreAnalysisPassAnalyzeFunctionCallers";
import { PreWasmPassTransientVariablePropagation } from "./passes/PreWasmPassTransientVariablePropagation";
import { compileModule, createModule, SpiderElementFuncIdxActive, SpiderFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderNumberType, SpiderOpcodes, SpiderReferenceType, SpiderTypeDefinition, SpiderValueType, writeModule } from "wasm-spider";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipCompilerSubsystem, CatnipCompilerSubsystemClass } from "./CatnipCompilerSubsystem";
import { CatnipIrExternalBranch } from "./CatnipIrBranch";
import { CatnipOp } from "../ops";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";
import { CatnipWasmStructHeapString } from "../wasm-interop/CatnipWasmStructHeapString";
import { CatnipRuntimeModule } from "../runtime/CatnipRuntimeModule";
import { LoopPassTypeAnalysis } from "./passes/AnalysisPassTypeAnalysis";
import { CatnipEventID, CatnipEvents } from "../CatnipEvents";
import { CatnipCompilerEvent } from "./CatnipCompilerEvent";
import binaryen from "binaryen";

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

    public readonly spiderModule: SpiderModule;
    public readonly spiderMemory: SpiderImportMemory;
    public readonly spiderIndirectFunctionTable: SpiderImportTable;
    public readonly spiderIndirectFunctionType: SpiderTypeDefinition;
    private readonly _spiderFunctionNop: SpiderFunctionDefinition;

    private readonly _runtimeFuncs: ReadonlyMap<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;
    private readonly _subsystems: Map<CatnipCompilerSubsystemClass, CatnipCompilerSubsystem>;
    private readonly _callbacks: Map<catnip_compiler_callback, CallbackInfo>;
    private readonly _events: Map<CatnipEventID, CatnipCompilerEvent>;

    private readonly _scripts: Map<CatnipSpriteID, Map<CatnipScriptID, CatnipIr>>;

    private readonly _freeFunctionTableIndices: number[];
    private _functionTableOffset: number;
    private _functionTableIndexCount: number;

    private _exportCount: number;

    constructor(project: CatnipProject, config?: CatnipCompilerConfig) {
        this.project = project;
        this.config = config ? { ...config } : catnipCreateDefaultCompilerConfig();
        this._passes = new Map();

        this.addPass(PreLoopPassAnalyzeFunctionCallers);

        if (this.config.enable_optimization_variable_inlining)
            this.addPass(LoopPassVariableInlining);

        if (this.config.enable_optimization_type_analysis)
            this.addPass(LoopPassTypeAnalysis)

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
        this._functionTableIndexCount = 0;
        this._functionTableOffset = 1; // Starts at 1 because we never allocate function table index 0

        while (this.runtimeModule.indirectFunctionTable.get(this._functionTableOffset) !== null) {
            ++this._functionTableOffset;

            if (this._functionTableOffset == this.runtimeModule.indirectFunctionTable.length) {
                break;
            }
        }

        this._exportCount = 0;

        this._subsystems = new Map();
        this._events = new Map();

        this._callbacks = new Map();
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

        this._runPass(ir, CatnipCompilerStage.PASS_PRE_ANALYSIS);
        this._runPass(ir, CatnipCompilerStage.PASS_ANALYSIS);
        this._runPass(ir, CatnipCompilerStage.PASS_POST_ANALYSIS);
        this._runPass(ir, CatnipCompilerStage.PASS_PRE_WASM_GEN);

        if (this.config.ir_dump) {
            console.log("" + ir);
        }
    }

    public async createModule(): Promise<CatnipProjectModule> {

        this._preAnalyzeIRs();

        for (const scriptIR of this._enumerateScripts()) {
            if (!scriptIR.hasCommandIR)
                this._createCommandIR(scriptIR);
        }

        for (const scriptIR of this._enumerateScripts()) {
            scriptIR.createWASM();
        }
        
        for (const subsystem of this._subsystems.values()) {
            if (subsystem.addEvents)
                subsystem.addEvents();
        }

        let eventID: CatnipEventID;
        for (eventID in CatnipEvents) {
            if (this._events.has(eventID) || this.project.hasEventListeners(eventID)) {
                this._getEvent(eventID).generateFunction();
            }
        }

        const functionsElement = this._createFunctionsElement();

        const largetFunctionElement = functionsElement.init.length + functionsElement.offset.getAsConstNumber();

        if (largetFunctionElement > this.runtimeModule.indirectFunctionTable.length) {
            this.runtimeModule.indirectFunctionTable.grow(largetFunctionElement - this.runtimeModule.indirectFunctionTable.length);
        }

        const callbacks: Record<string, catnip_compiler_raw_callback> = {};

        for (const callback of this._callbacks.values()) {
            callbacks[callback.name] = callback.callback;
        }

        let moduleSource = writeModule(this.spiderModule, { mergeTypes: false });

        if (this.config.enable_binaryen_optimizer || this.config.binaryen_dump) {
            const binaryenModule = binaryen.readBinary(moduleSource);

            if (this.config.enable_binaryen_optimizer) {
                binaryenModule.optimize();
                moduleSource = binaryenModule.emitBinary();
            }

            if (this.config.binaryen_dump) {
                switch (this.config.binaryen_dump) {
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

        const module = await WebAssembly.compile(moduleSource);

        const instance = await WebAssembly.instantiate(module, {
            env: {
                memory: this.runtimeModule.imports.env.memory,
                indirect_function_table: this.runtimeModule.indirectFunctionTable
            },
            catnip: this.runtimeModule.functions,
            catnip_callbacks: callbacks
        });

        const events: CatnipProjectModuleEvent[] = [];
        for (const eventInfo of this._events.values())
            events.push({ id: eventInfo.id, exportName: eventInfo.export.name });

        const projectModule = new CatnipProjectModule(this.project, instance, events);

        // for (const eventInfo of functions.values()) {
        //     this.spiderModule.exports.splice(this.spiderModule.exports.indexOf(eventInfo.export), 1);
        //     this.spiderModule.functions.splice(this.spiderModule.functions.indexOf(eventInfo.func), 1);
        // }

        this._deleteFunctionsElement(functionsElement);

        return projectModule;
    }

    public addEventListener(id: CatnipEventID, func: SpiderFunction) {
        this._getEvent(id).addListener(func);
    }

    public getEventFunction(id: CatnipEventID): SpiderFunction | null {
        if (this._events.has(id) || this.project.hasEventListeners(id))
            return this._getEvent(id).func;
        return null;
    }

    private _getEvent(id: CatnipEventID): CatnipCompilerEvent {
        let event = this._events.get(id);

        if (event === undefined) {
            event = new CatnipCompilerEvent(this, id);
            this._events.set(id, event);
        }

        return event;
    }

    private _createFunctionsElement(): SpiderElementFuncIdxActive {
        const spiderFns: SpiderFunctionDefinition[] = new Array(this._functionTableIndexCount);
        spiderFns.fill(this._spiderFunctionNop);

        for (const ir of this._enumerateScripts()) {
            for (const func of ir.functions) {
                if (func.hasFunctionTableIndex) {
                    CatnipCompilerLogger.assert(spiderFns[func.functionTableIndex - this._functionTableOffset] === this._spiderFunctionNop);
                    spiderFns[func.functionTableIndex - this._functionTableOffset] = func.spiderFunction;
                }
            }
        }

        return this.spiderModule.createElementFuncIdxActive(
            this.spiderIndirectFunctionTable, this._functionTableOffset, spiderFns
        );
    }

    private _deleteFunctionsElement(element: SpiderElementFuncIdxActive) {
        this.spiderModule.elements.splice(this.spiderModule.elements.indexOf(element), 1);
    }

    public getRuntimeFunction(funcName: CatnipRuntimeModuleFunctionName): SpiderImportFunction {
        const func = this._runtimeFuncs.get(funcName);
        if (func === undefined) throw new Error(`Unknown runtime function '${funcName}'.`);
        return func;
    }

    public allocateFunctionTableIndex(): number {
        if (this._freeFunctionTableIndices.length !== 0)
            return this._freeFunctionTableIndices.pop()!;

        return (this._functionTableIndexCount++) + this._functionTableOffset;
    }

    public freeFunctionTableIndex(idx: number) {
        this._freeFunctionTableIndices.push(idx);
    }

    public allocateExportName(name: string): string {
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

    private _preAnalyzeIRs() {
        function analyzeOp(ir: CatnipIr, analysis: CatnipIrPreAnalysis, op: CatnipOp) {
            for (const inputOrSubstack of op.type.getInputsAndSubstacks(ir, op.inputs)) {
                if (Array.isArray(inputOrSubstack)) {
                    for (const command of inputOrSubstack)
                        analyzeOp(ir, analysis, command);
                } else {
                    analyzeOp(ir, analysis, inputOrSubstack);
                }
            }

            analysis.externalBranches.push(...op.type.getExternalBranches(ir, op.inputs));
            analysis.isYielding ||= op.type.isYielding(ir, op.inputs);
        }

        const analyses: Map<CatnipIr, CatnipIrPreAnalysis> = new Map();

        for (const ir of this._enumerateScripts()) {
            const analysis: CatnipIrPreAnalysis = {
                isYielding: false,
                externalBranches: []
            }

            analyses.set(ir, analysis);
            ir.setPreAnalysis(analysis);

            for (const command of ir.commands) {
                analyzeOp(ir, analysis, command);
            }
        }

        let modified = true;

        while (modified) {
            modified = false;

            for (const [ir, analysis] of analyses) {
                if (analysis.isYielding) continue;

                for (const externalBranch of analysis.externalBranches) {
                    if (externalBranch.isYielding()) {
                        analysis.isYielding = true;
                        modified = true;
                        break;
                    }
                }
            }
        }
    }

    public createRawCallback(
        name: string,
        callback: catnip_compiler_raw_callback,
        argFormats: CatnipValueFormat[],
        returnFormat: CatnipValueFormat | null,
    ): SpiderImportFunction {
        let callbackInfo = this._callbacks.get(callback);

        if (callbackInfo !== undefined) return callbackInfo.import;

        const parameterValueTypes: SpiderValueType[] = [];
        const returnValueType: SpiderValueType[] = [];

        for (const argFormat of argFormats)
            parameterValueTypes.push(CatnipValueFormatUtils.getFormatSpiderType(argFormat));

        if (returnFormat !== null)
            returnValueType.push(CatnipValueFormatUtils.getFormatSpiderType(returnFormat));

        callbackInfo = {
            name,
            callback,
            import: this.spiderModule.importFunction(
                "catnip_callbacks",
                name,
                this.spiderModule.createType(parameterValueTypes, ...returnValueType)
            ),
            argFormats,
            returnFormat
        };

        this._callbacks.set(callback, callbackInfo);
        return callbackInfo.import;
    }

    public createCallback(
        name: string,
        callback: catnip_compiler_callback,
        argFormats: CatnipValueFormat[],
        returnFormat: CatnipValueFormat | null,
    ): SpiderImportFunction {
        return this.createRawCallback(
            name,
            (...args: number[]) => {

                if (args.length !== argFormats.length)
                    throw new Error("Wrong callback arg types.");

                const convertedArgs: (number | string)[] = [];

                for (let i = 0; i < args.length; i++) {
                    const argFormat = argFormats[i];
                    const argValue = args[i];

                    if (CatnipValueFormatUtils.isAlways(argFormat, CatnipValueFormat.I32_HSTRING)) {
                        const bytes = argValue + CatnipWasmStructHeapString.size;
                        const byteLength = CatnipWasmStructHeapString.getMember(argValue, this.runtimeModule.memory, "bytelen") - CatnipWasmStructHeapString.size;

                        const stringValue = CatnipRuntimeModule.TEXT_DECODER.decode(this.runtimeModule.memory.buffer.slice(bytes, bytes + byteLength));

                        convertedArgs.push(stringValue);
                    } else {
                        convertedArgs.push(argValue);
                    }
                }

                const returnValue = callback(...convertedArgs);

                if (returnFormat !== null) {
                    if (returnValue === undefined)
                        throw new Error("Callback must return a value.");

                    if (CatnipValueFormatUtils.isAlways(returnFormat, CatnipValueFormat.I32_HSTRING)) {
                        return this.runtimeModule.allocateHeapString("" + returnValue);
                    } else {
                        if (typeof returnValue !== "number")
                            throw new Error("Expected callback return of type number.");
                        return returnValue;
                    }
                }
            },
            argFormats,
            returnFormat
        );
    }
}