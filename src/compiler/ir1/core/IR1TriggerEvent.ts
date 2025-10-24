import { CatnipEventID } from "../../../CatnipEvents";
import { EventTriggerSubsystem } from "../../subsystems/EventTriggerSubsystem";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Trigger } from "../IR1Trigger";


export class IR1TriggerEvent extends IR1Trigger {
    public readonly isTopLevel = true;

    public readonly eventID: CatnipEventID;

    public constructor(eventID: CatnipEventID) {
        super();
        this.eventID = eventID;
    }

    public emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.module.getSubsystem(EventTriggerSubsystem).addEventListener(
            this.eventID, emitter.spriteID, emitter.spiderFunction
        );
    }

    public stringify(): string {
        return `event '${this.eventID}'`;
    }

}
