import { CatnipEventID } from "../../../CatnipEvents";
import { IR1TriggerEvent } from "../../ir1/core/IR1TriggerEvent";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0Trigger } from "../IR0Trigger";

export class IR0TriggerEvent extends IR0Trigger {
    public eventID: CatnipEventID;
    public isWarp: boolean = false;
    public get name(): string { return this.eventID; }

    public constructor(eventID: CatnipEventID) {
        super();
        this.eventID = eventID;
    }
    
    public toIR1(): IR1Trigger {
        return new IR1TriggerEvent(this.eventID);
    }

    public clone(): IR0Trigger {
        return new IR0TriggerEvent(this.eventID);
    }
}
