import { IR1TriggerKeyPress } from "../../ir1/events/IR1TriggerKeyPress";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Trigger } from "../IR0Trigger";

export class IR0TriggerKeyPress extends IR0Trigger {
    public readonly key: number | null;
    public get name(): string { return `key_pressed '${this.key ?? "any"}'`; }
    public readonly isWarp: boolean = false;

    public constructor(key: number | null) {
        super();
        this.key = key;
    }

    public toIR1(): IR1Trigger {
        return new IR1TriggerKeyPress(this.key);
    }

    public clone(ctx: IR0CloneContext): IR0Trigger {
        return new IR0TriggerKeyPress(this.key);
    }
}