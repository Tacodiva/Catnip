import { SpiderExportFunction, SpiderFunction, SpiderFunctionDefinition, SpiderImportFunction, SpiderLocalParameterReference, SpiderOpcodes } from "wasm-spider";
import { CatnipEventID, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../CatnipEvents";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from './CatnipValueFormatUtils';
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";

export class CatnipCompilerEvent {
    public readonly compiler: CatnipCompiler;
    public readonly id: CatnipEventID;

    public readonly func: SpiderFunctionDefinition;
    private readonly _eventArgInfos: CatnipEventValueTypeInfo[];
    private readonly _eventArgs: SpiderLocalParameterReference[];
    private readonly _eventArgFormats: CatnipValueFormat[];

    public readonly export: SpiderExportFunction;

    private _moduleListeners: SpiderFunction[];
    private readonly _callback: SpiderImportFunction;

    public constructor(compiler: CatnipCompiler, id: CatnipEventID) {
        this.compiler = compiler;
        this.id = id;

        this.func = this.compiler.spiderModule.createFunction();
        this.export = this.compiler.spiderModule.exportFunction(
            this.compiler.allocateExportName(id), this.func
        );

        const eventInfo = CatnipEvents[id];

        this._eventArgInfos = [];
        this._eventArgs = [];
        this._eventArgFormats = [];

        for (const argTypeName of eventInfo.args) {
            const argInfo = CatnipEventValueTypes[argTypeName];
            this._eventArgInfos.push(argInfo);
            this._eventArgFormats.push(argInfo.format);

            const argType = CatnipValueFormatUtils.getFormatSpiderType(argInfo.format);
            this._eventArgs.push(
                this.func.addParameter(argType)
            );
        }

        this._moduleListeners = [];

        this._callback = this.compiler.createRawCallback(
            "event_" + this.id,
            this._wasmCallback,
            this._eventArgFormats, null
        );
    }

    private _wasmCallback = (...rawArgs: number[]) => {
        CatnipCompilerLogger.assert(rawArgs.length === this._eventArgs.length);

        const decodedArgs: any[] = [];

        for (let i = 0; i < rawArgs.length; i++) {
            decodedArgs.push(
                this._eventArgInfos[i].decodeWASM(this.compiler.project, rawArgs[i])
            );
        }

        for (const listener of this.compiler.project.getEventListeners(this.id)) {
            listener(...(decodedArgs as any));
        }
    }

    public addListener(func: SpiderFunction) {
        this._moduleListeners.push(func);
    }

    public hasListeners(): boolean {
        return this._moduleListeners.length !== 0
            || this.compiler.project.hasEventListeners(this.id);
    }

    public generateFunction() {
        if (!this.hasListeners()) return;

        this._moduleListeners.forEach(this._generateCall);

        for (const rawListener of this.compiler.project.getRawEventListeners(this.id)) {
            this._generateCall(this.compiler.createRawCallback(
                "event_listener_" + this.id,
                rawListener,
                this._eventArgFormats, null
            ))
        }

        this._generateCall(this._callback);
    }

    private _generateCall = (func: SpiderFunction) => {
        for (const eventArg of this._eventArgs) {
            this.func.body.emit(SpiderOpcodes.local_get, eventArg);
        }
        this.func.body.emit(SpiderOpcodes.call, func);
    }
}