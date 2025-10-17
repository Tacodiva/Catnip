import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Instruction } from "../../ir1/IR1";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1ExternalValue, IR1ExternalValueType } from "../../ir1/IR1ExternalValue";
import { IR0Input } from "../IR0";

export class IR0InputProcedureArgument extends IR0Input {

    public readonly index: number;

    public constructor(index: number) {
        super("procedure_argument", {});
        this.index = index;
    }

    public getResultFormat(): CatnipValueFormat {
        return CatnipValueFormat.F64;
    }

    public getExternalValues(): IR1ExternalValue[] {
        return [{
            type: IR1ExternalValueType.PROCEDURE_ARGUMENT,
            index: this.index 
        }];
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        throw new Error("Method not implemented.");
    }

}