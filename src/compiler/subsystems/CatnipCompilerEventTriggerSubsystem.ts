import { CatnipEventID } from "../../CatnipEvents";
import { CatnipCompiler } from "../CatnipCompiler";
import { CatnipCompilerSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipIrScriptEventTrigger } from "../ir/core/event_trigger";
import { CatnipTriggerFunctionGenerator } from "../CatnipTriggerGenerator";

export class CatnipCompilerEventTriggerSubsystem extends CatnipCompilerSubsystem {
    private readonly _triggers: Map<CatnipEventID, CatnipTriggerFunctionGenerator>;

    public constructor(compiler: CatnipCompiler) {
        super(compiler);
        this._triggers = new Map();
    }

    public addTrigger(trigger: CatnipIrScriptEventTrigger) {
        let eventInfo = this._triggers.get(trigger.inputs.id);

        if (eventInfo === undefined) {
            eventInfo = new CatnipTriggerFunctionGenerator(this.compiler, false);
            this._triggers.set(trigger.inputs.id, eventInfo);
        }

        eventInfo.addTrigger(trigger);
    }

    public addEvents(): void {
        for (const [eventID, eventInfo] of this._triggers)
            this.compiler.addEventListener(eventID, eventInfo.createEventFunction());
    }
}