import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../../compiler/CatnipIrScriptTrigger";
import { CatnipIrTransientVariable } from "../../compiler/CatnipIrTransientVariable";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipIrProcedureTriggerArg, ir_procedure_trigger } from "../../compiler/ir/procedure/procedure_trigger";
import { ProjectSB3Block } from "../../sb3";
import { registerSB3HatBlock } from "../../sb3_ops";
import { SB3ProcedureArgumentInfo } from "../../sb3_reader";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

export type CatnipProcedureID = string;

export enum CatnipProcedureTriggerArgType {
    STRING_OR_NUMBER,
    BOOLEAN
}

export interface CatinpProcedureTriggerArg {
    type: CatnipProcedureTriggerArgType,
    name: string,
}

export type procedure_trigger_inputs = {
    id: CatnipProcedureID,
    args: CatinpProcedureTriggerArg[]
}

export const procedure_trigger = new class extends CatnipScriptTriggerType<procedure_trigger_inputs> {

    public createTriggerIR(ir: CatnipIr, inputs: procedure_trigger_inputs): CatnipIrScriptTrigger {
        const args: CatnipIrProcedureTriggerArg[] = [];

        for (const arg of inputs.args) {
            const format = arg.type === CatnipProcedureTriggerArgType.BOOLEAN ? CatnipValueFormat.I32_BOOLEAN : CatnipValueFormat.F64;
            args.push({
                format,
                name: arg.name,
                variable: new CatnipIrTransientVariable(ir, format, arg.name)
            });
        }

        return ir_procedure_trigger.create(ir, {
            id: inputs.id,
            args
        });
    }

}

registerSB3HatBlock("procedures_definition", (ctx, block) => {

    const procPrototypeID = ctx.readBlockID(block.inputs.custom_block);
    const procPrototype = ctx.getBlock(procPrototypeID) as ProjectSB3Block<"procedures_prototype">;

    if (procPrototype.opcode !== "procedures_prototype")
        throw new Error(`Unexpected block '${procPrototype.opcode}' (block ${procPrototypeID}). Expected 'procedures_prototype'.`);

    const proccode = procPrototype.mutation.proccode;

    const sb3Args: SB3ProcedureArgumentInfo[] = [];
    const catnipArgs: CatinpProcedureTriggerArg[] = [];

    for (const inputID in procPrototype.inputs) {

        const input = procPrototype.inputs[inputID];
        const inputBlockID = ctx.readOptionalBlockID(input);
        
        if (inputBlockID === null) continue;

        const inputBlock = ctx.getBlock(inputBlockID) as 
            ProjectSB3Block<"argument_reporter_string_number"> | ProjectSB3Block<"argument_reporter_boolean">;

        let type: CatnipProcedureTriggerArgType;

        if (inputBlock.opcode === "argument_reporter_string_number") {
            type = CatnipProcedureTriggerArgType.STRING_OR_NUMBER;
        } else if (inputBlock.opcode === "argument_reporter_boolean") {
            type = CatnipProcedureTriggerArgType.BOOLEAN;
        } else {
            throw new Error(`Unexpected block '${(inputBlock as ProjectSB3Block).opcode}' (block ${inputBlockID}). Expected 'argument_reporter_string_number' or 'argument_reporter_boolean'.`)
        }
        
        const inputName = ""+inputBlock.fields.VALUE[0];

        sb3Args.push({
            id: inputID,
            name: inputName,
            type
        });

        catnipArgs.push({
            name: inputName,
            type
        });
    }

    const procedureID = ctx.meta.addProcedure(
        proccode,
        sb3Args
    )

    return procedure_trigger.create({
        id: procedureID,
        args: catnipArgs
    });
});