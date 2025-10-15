import { CatnipEventID } from "../../CatnipEvents";
import { EventTriggerSubsystem } from "../subsystems/EventTriggerSubsystem";
import { CatnipCompilerWasmEmitter } from "../wasm/CatnipCompilerWasmEmitter";
import { IR1StringificationContext } from "./IR1";

export abstract class IR1Trigger {

    public abstract emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void;
    public abstract stringify(): string;

}

export class IR1TriggerEvent extends IR1Trigger {
    
    public readonly eventID: CatnipEventID;
    
    public constructor(eventID: CatnipEventID) {
        super();
        this.eventID = eventID;
    }
    
    public emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.module.getSubsystem(EventTriggerSubsystem).addTrigger(
            this.eventID, emitter.spriteID, emitter.spiderFunction
        );
    }
    
    public stringify(): string {
        return `event '${this.eventID}'`;
    }

}