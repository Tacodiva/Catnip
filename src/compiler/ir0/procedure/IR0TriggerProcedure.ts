import { CatinpProcedureTriggerArg, CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { IR1TriggerProcedure } from "../../ir1/procedure/IR1TriggerProcedure";
import { IR1Trigger } from "../../ir1/IR1Trigger";
import { IR0Trigger } from "../IR0Trigger";

export class IR0TriggerProcedure extends IR0Trigger {

    public readonly procedureID: CatnipProcedureID;
    public readonly args: readonly CatinpProcedureTriggerArg[];
    public readonly isWarp: boolean;

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

    public clone() {
        const args: CatinpProcedureTriggerArg[] = [];
        for (const arg of this.args) args.push({...arg});
        return new IR0TriggerProcedure(this.procedureID, args, this.isWarp);
    }
}