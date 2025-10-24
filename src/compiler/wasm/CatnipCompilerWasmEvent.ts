import { SpiderExportFunction, SpiderExpression, SpiderFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderLocalParameterReference, SpiderNumberType, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipEventID, CatnipEventListener, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../../CatnipEvents";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { CatnipCompilerWasmModule } from "./CatnipCompilerWasmModule";
import { CatnipWasmEnumEventSource } from "../../wasm-interop/CatnipWasmEnumEventSource";

export enum CatnipCompilerWasmEventFilter {
    ANY,
    EXTERNAL_ONLY,
    INTERNAL_ONLY
}

export class CatnipCompilerWasmEvent {
    public readonly module: CatnipCompilerWasmModule;
    public get compiler() { return this.module.compiler; }

    public readonly id: CatnipEventID;

    private readonly _argInfos: readonly CatnipEventValueTypeInfo[];
    private readonly _argFormats: readonly CatnipValueFormat[];
    private readonly _argTypes: readonly SpiderValueType[];

    private readonly _rawListeners: {
        listener: SpiderFunction,
        filter: CatnipCompilerWasmEventFilter
    }[];

    public readonly jsListenerInfo: {
        readonly import: SpiderImportFunction;
        readonly listenersArray: CatnipEventListener[];
    } | null;

    public readonly func: SpiderFunctionDefinition;
    public readonly funcExport: SpiderExportFunction;
    private readonly _funcSourceParam: SpiderLocalParameterReference;
    private readonly _funcParams: readonly SpiderLocalParameterReference[];

    public readonly supportsCompilerListeners: boolean;


    public constructor(id: CatnipEventID, module: CatnipCompilerWasmModule) {
        this.id = id;
        this.module = module;

        this.supportsCompilerListeners = CatnipEvents[id].supportsCompilerListeners;
        this._argInfos = CatnipEvents[id].args.map(arg => CatnipEventValueTypes[arg]);
        this._argFormats = this._argInfos.map(arg => arg.format);
        this._argTypes = this._argFormats.map(CatnipValueFormatUtils.getFormatSpiderType);

        const config = this.compiler.config.events[id];

        this._rawListeners = [];
        const configRawListeners = config?.raw_listeners ?? [];

        for (const rawListener of configRawListeners) {
            this._rawListeners.push({
                listener: this.module.importDirectCallback(`${id} raw listener`, rawListener, this._argTypes, null),
                filter: CatnipCompilerWasmEventFilter.ANY
            })
        }

        const configEnableJsListeners = config?.enable_js_listeners ?? false;

        if (configEnableJsListeners) {
            const listenersArray: CatnipEventListener[] = [];

            this.jsListenerInfo = {
                listenersArray,
                import: this.module.importDirectCallback(`${id} js listener`, (...rawArgs: any[]) => {

                    CatnipCompilerLogger.assert(rawArgs.length === this._argTypes.length);

                    const decodedArgs: any[] = [];

                    for (let i = 0; i < rawArgs.length; i++) {
                        decodedArgs.push(
                            this._argInfos[i].decodeWASM(this.compiler.project, rawArgs[i])
                        );
                    }

                    for (const listener of listenersArray) {
                        listener(...(decodedArgs as any));
                    }
                }, this._argTypes, null)
            };
        } else {
            this.jsListenerInfo = null;
        }

        this.func = this.module.spiderModule.createFunction();
        this.funcExport = this.module.spiderModule.exportFunction(this.module.uniquifyExportName(`${id} trigger`), this.func);

        this._funcSourceParam = this.func.addParameter(SpiderNumberType.i32);

        const funcParams: SpiderLocalParameterReference[] = [];
        for (const argType of this._argTypes) {
            funcParams.push(this.func.addParameter(argType));
        }
        this._funcParams = funcParams;
    }

    public addListener(listener: SpiderFunction, filter: CatnipCompilerWasmEventFilter = CatnipCompilerWasmEventFilter.ANY, force: boolean = false): void {
        if (!force && !this.supportsCompilerListeners)
            throw new Error("This event does not support compiler listeners.");

        this.compiler.assertStageBefore(CatnipCompilerStage.MODULE_WRITE);
        this._rawListeners.push({ listener, filter });
    }

    public preModuleWrite(): void {
        this.compiler.assertStage(CatnipCompilerStage.MODULE_PREWRITE);

        const _generateCall = (expr: SpiderExpression, func: SpiderFunction) => {
            for (const eventArg of this._funcParams) {
                expr.emit(SpiderOpcodes.local_get, eventArg);
            }
            expr.emit(SpiderOpcodes.call, func);
        }

        for (const listenerInfo of this._rawListeners) {

            switch (listenerInfo.filter) {
                case CatnipCompilerWasmEventFilter.ANY:
                    _generateCall(this.func.body, listenerInfo.listener);
                    break;
                case CatnipCompilerWasmEventFilter.EXTERNAL_ONLY:
                    this.func.body.emit(SpiderOpcodes.local_get, this._funcSourceParam);
                    this.func.body.emit(SpiderOpcodes.i32_const, CatnipWasmEnumEventSource.EXTERNAL);
                    this.func.body.emit(SpiderOpcodes.i32_eq);
                    this.func.body.emitIf(expr => _generateCall(expr, listenerInfo.listener))
                    break;
                case CatnipCompilerWasmEventFilter.INTERNAL_ONLY:
                    this.func.body.emit(SpiderOpcodes.local_get, this._funcSourceParam);
                    this.func.body.emit(SpiderOpcodes.i32_const, CatnipWasmEnumEventSource.INTERNAL);
                    this.func.body.emit(SpiderOpcodes.i32_eq);
                    this.func.body.emitIf(expr => _generateCall(expr, listenerInfo.listener))
                    break;
            }
        }

        if (this.jsListenerInfo !== null) {
            _generateCall(this.func.body, this.jsListenerInfo.import);
        }
    }
}