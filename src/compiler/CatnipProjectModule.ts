import { createModule, SpiderElementFuncIdxActive, SpiderFunctionDefinition, SpiderImportFunction, SpiderImportMemory, SpiderImportTable, SpiderModule, SpiderReferenceType } from "wasm-spider";
import { CatnipRuntimeModule } from "../runtime/CatnipRuntimeModule";
import { CatnipRuntimeModuleFunctionName, CatnipRuntimeModuleFunctions } from "../runtime/CatnipRuntimeModuleFunctions";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { createLogger, Logger } from "../log";

export class CatnipProjectModule {
    private static readonly _logger: Logger = createLogger("CatnipProjectModule");

    public readonly runtimeModule: CatnipRuntimeModule;

    public readonly spiderModule: SpiderModule;

    public readonly spiderMemory: SpiderImportMemory;
    public readonly spiderIndirectFunctionTable: SpiderImportTable;

    private readonly _runtimeFuncs: Map<CatnipRuntimeModuleFunctionName, SpiderImportFunction>;
    private _spiderFunctionElement: SpiderElementFuncIdxActive | null;

    public constructor(runtimeModule: CatnipRuntimeModule) {
        this.runtimeModule = runtimeModule;

        this.spiderModule = createModule();
        this.spiderMemory = this.spiderModule.importMemory("env", "memory");
        this.spiderIndirectFunctionTable = this.spiderModule.importTable(
            "env", "indirect_function_table",
            SpiderReferenceType.funcref, 0
        );

        this._spiderFunctionElement = null;

        this._runtimeFuncs = new Map();

        let funcName: CatnipRuntimeModuleFunctionName;
        for (funcName in CatnipRuntimeModuleFunctions) {
            const func = CatnipRuntimeModuleFunctions[funcName];
            const funcType = this.spiderModule.createType(func.args, ...(func.result === undefined ? [] : [func.result]));
            this._runtimeFuncs.set(funcName, this.spiderModule.importFunction("catnip", funcName, funcType));
        }
    }

    public getRuntimeFunction(funcName: CatnipRuntimeModuleFunctionName): SpiderImportFunction {
        const func = this._runtimeFuncs.get(funcName);
        if (func === undefined) throw new Error(`Unknown runtime function '${funcName}'.`);
        return func;
    }

    public createFunctionsElement(functions: CatnipIrFunction[]) {
        CatnipProjectModule._logger.assert(this._spiderFunctionElement === null, false, "Functions element created twice!");

        const spiderFns: SpiderFunctionDefinition[] = [];
        const baseIdx = 1;
        let idx = baseIdx;

        for (const fn of functions) {
            if (fn.needsFunctionTableIndex) {
                fn.functionTableIndex = idx++;
                spiderFns.push(fn.spiderFunction);
            }
        }

        this._spiderFunctionElement = this.spiderModule.createElementFuncIdxActive(
            this.spiderIndirectFunctionTable, baseIdx, spiderFns
        );
    }

}