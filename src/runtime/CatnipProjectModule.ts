import { CatnipEventArgs, CatnipEventID, CatnipEventListener, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../CatnipEvents";
import { createLogger, Logger } from "../log";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipRuntimeModule } from "../runtime/CatnipRuntimeModule";
import { CatnipWasmStructRuntime } from "../wasm-interop/CatnipWasmStructRuntime";
import { WasmStructWrapper } from "../wasm-interop/wasm-types";

export type CatnipProjectModuleEvent<TEvnetID extends CatnipEventID = CatnipEventID> = { id: TEvnetID, exportName: string };

export class CatnipProjectModule {
    private static readonly _logger: Logger = createLogger("CatnipProjectModule");

    public readonly project: CatnipProject;
    
    public readonly runtimeModule: CatnipRuntimeModule;
    public readonly runtimeInstance: WasmStructWrapper<typeof CatnipWasmStructRuntime>;

    public readonly instance: WebAssembly.Instance;
    private _events: Map<CatnipEventID, CatnipEventListener> = new Map();
    
    /** @internal */
    constructor(project: CatnipProject, instance: WebAssembly.Instance, events: CatnipProjectModuleEvent[]) {
        this.project = project;
        this.instance = instance;
        this.runtimeModule = project.runtimeModule;
        this.runtimeInstance = project.runtimeInstance;

        this._events = new Map();
        for (const event of events) {
            const eventExport = this.instance.exports[event.exportName] as (CatnipEventListener | undefined);
            if (eventExport === undefined) throw new Error(`Can't find event export '${event.exportName}'.`);
            this._events.set(event.id, eventExport);
        }
    }

    public triggerEvent<TEventID extends CatnipEventID>(event: TEventID, ...args: CatnipEventArgs<TEventID>): void {
        CatnipProjectModule._logger.assert(CatnipEvents[event].args.length === args.length);

        const eventLambda = this._events.get(event);
        if (eventLambda === undefined) return;

        const encodedArgs: any[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const argInfo = CatnipEventValueTypes[CatnipEvents[event].args[i]] as CatnipEventValueTypeInfo;
            encodedArgs.push(argInfo.encodeWASM(this.project, arg));
        }

        eventLambda(...(encodedArgs as any));
    }

    public start(): void {
        this.triggerEvent("PROJECT_START");
    }

    public step(): void {
        this.runtimeModule.functions.catnip_runtime_tick(this.runtimeInstance.ptr);
        this._penFlush();
    }

    private _penFlush(): void {
        this.runtimeModule.functions.catnip_runtime_render_pen_flush(this.runtimeInstance.ptr);
    }

}