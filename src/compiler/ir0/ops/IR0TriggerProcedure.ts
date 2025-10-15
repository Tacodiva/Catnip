import { CatinpProcedureTriggerArg, CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { IR1TriggerProcedure } from "../../ir1/instructions/IR1TriggerProcedure";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0Trigger } from "../IR0Trigger";

export class IR0TriggerProcedure extends IR0Trigger {

    public readonly isWarp: boolean;
    public readonly args: readonly CatinpProcedureTriggerArg[];
    public readonly procedureID: CatnipProcedureID;

    public get name() { return this.procedureID; }

    public constructor(id: CatnipProcedureID, args: readonly CatinpProcedureTriggerArg[], isWarp: boolean) {
        super();
        this.procedureID = id;
        this.isWarp = isWarp;
        this.args = args;
    }

    public toIR1(): IR1Trigger {
        return new IR1TriggerProcedure(this.procedureID, this.isWarp);
    }

}