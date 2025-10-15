import { createModule, SpiderFunction, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderNumberType, SpiderReferenceType, SpiderTypeDefinition, SpiderValueType, writeModule } from "wasm-spider";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { CatnipWasmStructHeapString } from "../../wasm-interop/CatnipWasmStructHeapString";
import UTF16 from "../../utf16";
import { CatnipEventID } from "../../CatnipEvents";
import { CatnipCompilerWasmEvent } from "./CatnipCompilerWasmEvent";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipProjectModuleEvent } from "../../runtime/CatnipProjectModule";
import { CatnipCompilerModuleSubsystem, CatnipCompilerModuleSubsystemClass } from "../CatnipCompilerSubsystem";

export type catnip_compiler_callback = (...args: any[]) => void | number | string;

interface CallbackInfo {
    name: string;
    import: SpiderImportFunction;
    callback: Function;
}

export class CatnipCompilerWasmModule {

    public readonly compiler: CatnipCompiler;

    public get project() { return this.compiler.project; }
    public get runtimeModule() { return this.compiler.project.runtimeModule; }
    public get runtimeInstance() { return this.compiler.project.runtimeInstance; }

    public readonly spiderModule: SpiderModule;
    public readonly spiderMemory: SpiderImportMemory;
    public readonly spiderIndirectFunctionTable: SpiderImportTable;
    public readonly spiderIndirectFunctionType: SpiderTypeDefinition;

    private readonly _subsystems: Map<CatnipCompilerModuleSubsystemClass, CatnipCompilerModuleSubsystem>;

    // We need to import all the functions we need from the runtime into the module we're constructing
    //   This maps between runtime function names and that function's import.
    private readonly _runtimeFuncs: ReadonlyMap<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;

    private readonly _functionTableOffset: number;
    private readonly _functionTable: SpiderFunction[];

    private readonly _directCallbacks: Map<Function, CallbackInfo>;
    private readonly _directCallbackNames: Set<string>;
    private readonly _callbacks: Map<catnip_compiler_callback, Function>;

    private readonly _events: Map<CatnipEventID, CatnipCompilerWasmEvent>;


    private readonly _exportNames: Set<string>;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;

        this.spiderModule = createModule();
        this.spiderMemory = this.spiderModule.importMemory("env", "memory");
        this.spiderIndirectFunctionTable = this.spiderModule.importTable(
            "env", "indirect_function_table",
            SpiderReferenceType.funcref, 0
        );
        this.spiderIndirectFunctionType = this.spiderModule.createType(
            [SpiderNumberType.i32]
        );

        this._subsystems = new Map();

        // Create all the imports for the runtime functions
        {
            const runtimeFuncs = new Map();
            this._runtimeFuncs = runtimeFuncs;

            let funcName: CatnipRuntimeModuleFunctionName;
            for (funcName in CatnipRuntimeModuleFunctions) {
                const func = CatnipRuntimeModuleFunctions[funcName];
                const funcType = this.spiderModule.createType(func.args, ...(func.result === undefined ? [] : [func.result]));
                runtimeFuncs.set(funcName, this.spiderModule.importFunction("catnip", funcName, funcType));
            }
        }

        this._functionTableOffset = 1;
        this._functionTable = [];

        // The C module might use some indirect function indices, so we need to find an offset for our
        //   function table where we wont touch the ones already there.
        while (this.project.runtimeModule.indirectFunctionTable.get(this._functionTableOffset) !== null) {
            ++this._functionTableOffset;
        }

        this._directCallbacks = new Map();
        this._directCallbackNames = new Set();
        this._callbacks = new Map();

        this._events = new Map();

        this._exportNames = new Set();

        // Create all the events specificed in the config
        for (const eventID in this.compiler.config.events) {
            this.getEvent(eventID as CatnipEventID);
        }

    }


    public getSubsystem<
        TClass extends CatnipCompilerModuleSubsystemClass<TSubsystem>,
        TSubsystem extends CatnipCompilerModuleSubsystem =
        TClass extends CatnipCompilerModuleSubsystemClass<infer I> ? I : never
    >(subsystemClass: TClass): TSubsystem {
        this.compiler.assertStageBefore(CatnipCompilerStage.MODULE_WRITE);

        const mapSubsystem = this._subsystems.get(subsystemClass);

        if (mapSubsystem !== undefined)
            return mapSubsystem as TSubsystem;

        const newSubsystem = new subsystemClass(this);
        this._subsystems.set(subsystemClass, newSubsystem);

        return newSubsystem;
    }

    /**
     * Gets the import for the runtime function with the given name.
     */
    public getRuntimeFunction(funcName: CatnipRuntimeModuleFunctionName): SpiderImportFunction {
        const func = this._runtimeFuncs.get(funcName);
        if (func === undefined) throw new Error(`Unknown runtime function '${funcName}'.`);
        return func;
    }

    /**
     * Adds a function which can be called directly by the WASM module.
     * 
     * @param name The name of this callback, helpful for debugging
     * @param callback The function that will be imported by the WASM module
     * @param argFormats An array of the types of each argument
     * @param returnFormat The type of the return value, or null if no return value
     * @returns The imported callback  
     */
    public importDirectCallback(
        name: string,
        callback: Function,
        argFormats: readonly SpiderValueType[],
        returnFormat: SpiderValueType | null,
    ): SpiderImportFunction {

        let callbackInfo = this._directCallbacks.get(callback);

        // If we have already imported this callback, no need to do it again.
        if (callbackInfo !== undefined) return callbackInfo.import;

        const uniqueName = this.uniquifyDirectCallbackName(name);

        callbackInfo = {
            name: uniqueName,
            callback,
            import: this.spiderModule.importFunction(
                "catnip_callbacks",
                uniqueName,
                returnFormat ?
                    this.spiderModule.createType([...argFormats], returnFormat) :
                    this.spiderModule.createType([...argFormats])
            )
        };

        this._directCallbacks.set(callback, callbackInfo);
        return callbackInfo.import;
    }

    /**
     * Adds a function which can be called by the WASM module, and has its inputs converted into JavaScript types.
     * 
     * @param name The name of this callback, helpful for debugging
     * @param callback The function that will be imported by the WASM module
     * @param argFormats An array of the types of each argument
     * @param returnFormat The type of the return value, or null if no return value
     * @returns The imported callback  
     */
    public importCallback(
        name: string,
        callback: catnip_compiler_callback,
        argFormats: readonly CatnipValueFormat[],
        returnFormat: CatnipValueFormat | null,
    ): SpiderImportFunction {

        let directCallback = this._callbacks.get(callback);

        // If we have already imported this callback, no need to do it again.
        if (directCallback !== undefined)
            return this._directCallbacks.get(directCallback)!.import;

        directCallback = (...args: number[]) => {
            if (args.length !== argFormats.length)
                throw new Error("Wrong callback arg types.");

            const convertedArgs: (number | string)[] = [];

            for (let i = 0; i < args.length; i++) {
                const argFormat = argFormats[i];
                const argValue = args[i];

                if (CatnipValueFormatUtils.isAlways(argFormat, CatnipValueFormat.I32_HSTRING)) {
                    const bytes = argValue + CatnipWasmStructHeapString.size;
                    const byteLength = CatnipWasmStructHeapString.getMember(argValue, this.runtimeModule.memory, "bytelen") - CatnipWasmStructHeapString.size;

                    const stringValue = UTF16.decode(this.runtimeModule.memory.buffer.slice(bytes, bytes + byteLength));

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
                    return this.runtimeModule.createCanonHString("" + returnValue);
                } else {
                    if (typeof returnValue !== "number")
                        throw new Error("Expected callback return of type number.");
                    return returnValue;
                }
            }
        };

        this._callbacks.set(callback, directCallback);

        return this.importDirectCallback(
            name,
            directCallback,
            argFormats.map(format => CatnipValueFormatUtils.getFormatSpiderType(format)),
            returnFormat ? CatnipValueFormatUtils.getFormatSpiderType(returnFormat) : null
        );
    }

    private static uniquifyName(name: string, taken: Set<string>): string {
        let counter = 1;
        let uniqueName = name;

        while (taken.has(name)) {
            uniqueName = `${name}_${counter++}`;
        }

        taken.add(uniqueName);

        return uniqueName;
    }

    private uniquifyDirectCallbackName(name: string) {
        return CatnipCompilerWasmModule.uniquifyName(name, this._directCallbackNames);
    }

    public uniquifyExportName(name: string) {
        return CatnipCompilerWasmModule.uniquifyName(name, this._exportNames);
    }

    public getCallbacks(): Record<string, Function> {
        const callbacks: Record<string, Function> = {};

        for (const callbackInfo of this._directCallbacks.values()) {
            callbacks[callbackInfo.import.name] = callbackInfo.callback;
        }

        return callbacks;
    }

    public getEvent(id: CatnipEventID): CatnipCompilerWasmEvent {
        let event = this._events.get(id);
        if (event !== undefined) return event;
        this._events.set(id, event = new CatnipCompilerWasmEvent(id, this));
        return event;
    }

    public addEventListener(id: CatnipEventID, func: SpiderFunction) {
        this.getEvent(id).addListener(func);
    }

    public getEvents(): CatnipCompilerWasmEvent[] {
        return [...this._events.values()];
    }

    public getFunctionTableIndex(func: SpiderFunction): number {
        let tableIndex = this._functionTable.indexOf(func);

        if (tableIndex !== -1) return tableIndex + this._functionTableOffset;

        tableIndex = this._functionTable.length;
        this._functionTable.push(func);

        return tableIndex + this._functionTableOffset;
    }

    public preWrite() {
        this.compiler.assertStage(CatnipCompilerStage.MODULE_PREWRITE);

        for (const subsystem of this._subsystems.values()) {
            if (subsystem.preModuleWrite) subsystem.preModuleWrite();
        }

        for (const event of this._events.values()) {
            event.preModuleWrite();
        }

        // Create the functions element to fill in the function table
        this.spiderModule.createElementFuncIdxActive(
            this.spiderIndirectFunctionTable, this._functionTableOffset, this._functionTable
        );
    }

    public write(): Uint8Array {
        this.compiler.assertStage(CatnipCompilerStage.MODULE_WRITE);
        return writeModule(this.spiderModule, { mergeTypes: false });
    }

}