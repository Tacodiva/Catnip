import { CatnipEventArgs, CatnipEventID, CatnipEventListener, CatnipEvents, CatnipEventValueTypeInfo, CatnipEventValueTypes } from "../CatnipEvents";
import { createLogger, Logger } from "../log";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";

export type CatnipProjectModuleEvent<TEvnetID extends CatnipEventID = CatnipEventID> = { id: TEvnetID, exportName: string };

export class CatnipProjectModule {
    private static readonly _logger: Logger = createLogger("CatnipProjectModule");

    public readonly project: CatnipProject;
    public readonly instance: WebAssembly.Instance;
    private _events: Map<CatnipEventID, CatnipEventListener> = new Map();

    public constructor(project: CatnipProject, instance: WebAssembly.Instance, events: CatnipProjectModuleEvent[]) {
        this.project = project;
        this.instance = instance;

        this._events = new Map();
        for (const event of events) {
            const eventExport = this.instance.exports[event.exportName] as (CatnipEventListener | undefined);
            if (eventExport === undefined) throw new Error(`Can't find event export '${event.exportName}'.`);
            this._events.set(event.id, eventExport);
        }
    }

    public triggerEvent<TEventID extends CatnipEventID>(event: TEventID, ...args: CatnipEventArgs<TEventID>): void {
        CatnipCompilerLogger.assert(CatnipEvents[event].args.length === args.length);

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
}