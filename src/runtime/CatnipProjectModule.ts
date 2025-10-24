import { CatnipEventArgs, CatnipEventID, CatnipEventListener, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../CatnipEvents";
import { createLogger, Logger } from "../log";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipRuntimeModule } from "../runtime/CatnipRuntimeModule";
import { CatnipWasmStructRuntime } from "../wasm-interop/CatnipWasmStructRuntime";
import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipRuntimeGcStats } from '../wasm-interop/CatnipWasmStructRuntimeGcStats';
import { CatnipWasmEnumEventSource } from "../wasm-interop/CatnipWasmEnumEventSource";

export interface CatnipProjectModuleEvent<TEvnetID extends CatnipEventID = CatnipEventID> {
    readonly id: TEvnetID;
    // The function to call to trigger the event
    readonly jsTrigger: (source: CatnipWasmEnumEventSource.EXTERNAL, ...arg: any[]) => void;
    // The list of listeners the module will call when the event is triggered
    //   If null, this event was not compiled with JS listeners supported
    //   This must stay readonly, the array object must not change
    readonly jsListeners: CatnipEventListener<TEvnetID>[] | null;
};

export class CatnipProjectModule {
    private static readonly _logger: Logger = createLogger("CatnipProjectModule");

    public readonly project: CatnipProject;

    public readonly runtimeModule: CatnipRuntimeModule;
    public readonly runtimeInstance: WasmStructWrapper<typeof CatnipWasmStructRuntime>;

    public readonly instance: WebAssembly.Instance;

    // A map of event ID to info about that event.
    // If this map does not contain a given event ID, it means the project has nothing which listens for that event.
    private readonly _events: ReadonlyMap<CatnipEventID, CatnipProjectModuleEvent> = new Map();

    /** @internal */
    constructor(project: CatnipProject, instance: WebAssembly.Instance, events: readonly CatnipProjectModuleEvent[]) {
        this.project = project;
        this.instance = instance;
        this.runtimeModule = project.runtimeModule;
        this.runtimeInstance = project.runtimeInstance;

        const eventMap = new Map();
        
        for (const event of events) {
            eventMap.set(event.id, event);
        }

        this._events = eventMap;
    }

    public triggerEvent<TEventID extends CatnipEventID>(event: TEventID, ...args: CatnipEventArgs<TEventID>) {
        CatnipProjectModule._logger.assert(CatnipEvents[event].args.length === args.length);

        const eventInfo = this._events.get(event);
        if (eventInfo === undefined) return;

        const encodedArgs: any[] = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const argInfo = CatnipEventValueTypes[CatnipEvents[event].args[i]] as CatnipEventValueTypeInfo;
            encodedArgs.push(argInfo.encodeWASM(this.project, arg));
        }

        eventInfo.jsTrigger(CatnipWasmEnumEventSource.EXTERNAL, ...(encodedArgs as any));
    }

    public addEventListener<TEventID extends CatnipEventID>(event: TEventID, listener: CatnipEventListener<TEventID>) {
        const eventInfo = this._events.get(event);

        if (eventInfo === undefined || eventInfo.jsListeners === null)
            throw new Error(`Module was not compiled with event '${event}' supporting JS listeners.`);

        eventInfo.jsListeners.push(listener);
    }

    public removeEventListener<TEventID extends CatnipEventID>(event: TEventID, listener: CatnipEventListener<TEventID>): boolean {
        const eventInfo = this._events.get(event);

        if (eventInfo === undefined || eventInfo.jsListeners === null)
            return false;

        const listenerIndex = eventInfo.jsListeners.indexOf(listener);

        if (listenerIndex === -1)
            return false;

        eventInfo.jsListeners.splice(listenerIndex, 1);

        return true;
    }

    public supportsEventListener(event: CatnipEventID): boolean {
        const eventInfo = this._events.get(event);
        return eventInfo !== undefined && eventInfo.jsListeners !== null;
    }

    public start(): void {
        this.triggerEvent("PROJECT_START");
    }

    public step(): void {
        this.runtimeModule.functions.catnip_runtime_tick(this.runtimeInstance.ptr);
    }

    public frame(): void {
        // Flush pen lines
        this.runtimeModule.functions.catnip_runtime_render_pen_flush(this.runtimeInstance.ptr);
        // Call the renderer
        this.runtimeModule.renderer.frame();
    }

    public hasRunningThreads(): boolean {
        return this.runtimeModule.functions.catnip_runtime_has_running_threads(this.runtimeInstance.ptr) !== 0;
    }

    public getGcStats(): CatnipRuntimeGcStats {
        return this.runtimeInstance.getMemberWrapper("gc_stats").getInner();
    }

}