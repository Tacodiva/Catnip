import { createLogger, Logger } from "../log";
import { CatnipProject } from "../runtime/CatnipProject";
import { CatnipEventID } from "./ir/core/event_trigger";

export type CatnipProjectModuleEvent = { id: string, exportName: string };
type CatnipProjectEventLambda = (runtimePtr: number, threadListPtr: number) => void;

export class CatnipProjectModule {
    private static readonly _logger: Logger = createLogger("CatnipProjectModule");

    public readonly project: CatnipProject;
    public readonly instance: WebAssembly.Instance;
    private _events: Map<CatnipEventID, CatnipProjectEventLambda> = new Map();

    public constructor(project: CatnipProject, instance: WebAssembly.Instance, events: CatnipProjectModuleEvent[]) {
        this.project = project;
        this.instance = instance;

        this._events = new Map();
        for (const event of events) {
            const eventExport = this.instance.exports[event.exportName] as (CatnipProjectEventLambda | undefined);
            if (eventExport === undefined) throw new Error(`Can't find event export '${event.exportName}'.`);
            this._events.set(event.id, eventExport);
        }
    }

    public triggerEvent(event: CatnipEventID) {
        const eventLambda = this._events.get(event);

        if (eventLambda === undefined) return;

        eventLambda(this.project.runtimeInstance.ptr, 0);
    }
}