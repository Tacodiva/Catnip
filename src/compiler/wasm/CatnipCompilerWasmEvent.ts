import { SpiderExportFunction, SpiderFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderLocalParameterReference, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipEventID, CatnipEventListener, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../../CatnipEvents";
import { CatnipCompilerWasmModule } from "./CatnipCompilerWasmModule";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipProjectModuleEvent } from "../../runtime/CatnipProjectModule";

export class CatnipCompilerWasmEvent {
    public readonly module: CatnipCompilerWasmModule;
    public get compiler() { return this.module.compiler; }

    public readonly id: CatnipEventID;

    private readonly _argInfos: readonly CatnipEventValueTypeInfo[];
    private readonly _argFormats: readonly CatnipValueFormat[];
    private readonly _argTypes: readonly SpiderValueType[];

    private readonly _rawListeners: SpiderFunction[];

    public readonly jsListenerInfo: {
        readonly import: SpiderImportFunction;
        readonly listenersArray: CatnipEventListener[];
    } | null;

    public readonly func: SpiderFunctionDefinition;
    public readonly funcExport: SpiderExportFunction;
    private readonly _funcParams: readonly SpiderLocalParameterReference[];


    public constructor(id: CatnipEventID, module: CatnipCompilerWasmModule) {
        this.id = id;
        this.module = module;

        this._argInfos = CatnipEvents[id].args.map(arg => CatnipEventValueTypes[arg]);
        this._argFormats = this._argInfos.map(arg => arg.format);
        this._argTypes = this._argFormats.map(CatnipValueFormatUtils.getFormatSpiderType);

        const config = this.compiler.config.events[id];

        this._rawListeners = [];
        const configRawListeners = config?.raw_listeners ?? [];

        for (const rawListener of configRawListeners) {
            this._rawListeners.push(this.module.importDirectCallback(`${id} raw listener`, rawListener, this._argTypes, null))
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

        const funcParams: SpiderLocalParameterReference[] = [];
        for (const argType of this._argTypes) {
            funcParams.push(this.func.addParameter(argType));
        }
        this._funcParams = funcParams;
    }

    public addListener(listener: SpiderFunction): void {
        this.compiler.assertStageBefore(CatnipCompilerStage.MODULE_WRITE);
        this._rawListeners.push(listener);
    }

    public preModuleWrite(): void {
        this.compiler.assertStage(CatnipCompilerStage.MODULE_PREWRITE);

        const _generateCall = (func: SpiderFunction) => {
            for (const eventArg of this._funcParams) {
                this.func.body.emit(SpiderOpcodes.local_get, eventArg);
            }
            this.func.body.emit(SpiderOpcodes.call, func);
        }

        this._rawListeners.forEach(_generateCall);
        
        if (this.jsListenerInfo !== null) {
            _generateCall(this.jsListenerInfo.import);
        }
    }
}