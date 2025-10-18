import { IR1TriggerEvent } from "../../ir1/core/IR1TriggerEvent";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0Trigger } from "../IR0Trigger";


export class IR0TriggerEvent extends IR0Trigger {
    public name: string = "Green Flag";
    public isWarp: boolean = false;

    public toIR1(): IR1Trigger {
        return new IR1TriggerEvent("PROJECT_START");
    }
}
