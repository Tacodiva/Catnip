import { IR1TriggerBroadcast } from "../../ir1/events/IR1TriggerBroadcast";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Trigger } from "../IR0Trigger";

export class IR0TriggerBroadcast extends IR0Trigger {
    public readonly broadcastName: string;
    public get name(): string { return `broadcast '${this.broadcastName}'`; }
    public readonly isWarp: boolean = false;

    public constructor(broadcastName: string) {
        super();
        this.broadcastName = broadcastName;
    }

    public toIR1(): IR1Trigger {
        return new IR1TriggerBroadcast(this.broadcastName);
    }

    public clone(ctx: IR0CloneContext): IR0Trigger {
        return new IR0TriggerBroadcast(this.broadcastName);
    }
}