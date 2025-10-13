import { createModule, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderNumberType, SpiderReferenceType, SpiderTypeDefinition, SpiderValueType, writeModule } from "wasm-spider";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";
import { CatnipWasmStructHeapString } from "../wasm-interop/CatnipWasmStructHeapString";
import UTF16 from "../utf16";

export type catnip_compiler_callback = (...args: any[]) => void | number | string;
export type catnip_compiler_direct_callback = (...args: number[]) => void | number;

interface CallbackInfo {
    name: string;
    import: SpiderImportFunction;
    callback: catnip_compiler_direct_callback;
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

    // We need to import all the functions we need from the runtime into the module we're constructing
    //   This maps between runtime function names and that function's import.
    private readonly _runtimeFuncs: ReadonlyMap<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;

    private readonly _directCallbacks: Map<catnip_compiler_direct_callback, CallbackInfo>;
    private readonly _callbacks: Map<catnip_compiler_callback, catnip_compiler_direct_callback>;

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

        this._directCallbacks = new Map();
        this._callbacks = new Map();
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
        callback: catnip_compiler_direct_callback,
        argFormats: SpiderValueType[],
        returnFormat: SpiderValueType | null,
    ): SpiderImportFunction {

        let callbackInfo = this._directCallbacks.get(callback);

        // If we have already imported this callback, no need to do it again.
        if (callbackInfo !== undefined) return callbackInfo.import;

        callbackInfo = {
            name,
            callback,
            import: this.spiderModule.importFunction(
                "catnip_callbacks",
                name,
                returnFormat ?
                    this.spiderModule.createType(argFormats, returnFormat) :
                    this.spiderModule.createType(argFormats)
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
        argFormats: CatnipValueFormat[],
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

    public createModule() {
        return writeModule(this.spiderModule, { mergeTypes: false });
    }

    public getCallbacks(): Record<string, catnip_compiler_direct_callback> {
        const callbacks: Record<string, catnip_compiler_direct_callback> = {};

        for (const callbackInfo of this._directCallbacks.values()) {
            callbacks[callbackInfo.import.name] = callbackInfo.callback;
        }

        return callbacks;
    }

}