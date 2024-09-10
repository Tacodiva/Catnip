import { CatnipScriptTriggerProcedureArgDesc, CatnipScriptTriggerProcedureArgTypeDesc } from "../../runtime/CatnipScript";
import { ProjectSB3Block } from "../../sb3";
import { registerSB3CommandBlock, registerSB3HatBlock } from "../../sb3_ops";
import { SB3ProcedureArgumentInfo, SB3ProcedureInfo } from "../../sb3_reader";

registerSB3HatBlock("procedures_definition", (ctx, block) => {

    const procPrototypeID = ctx.readBlockID(block.inputs.custom_block);
    const procPrototype = ctx.getBlock(procPrototypeID) as ProjectSB3Block<"procedures_prototype">;

    if (procPrototype.opcode !== "procedures_prototype")
        throw new Error(`Unexpected block '${procPrototype.opcode}' (block ${procPrototypeID}). Expected 'procedures_prototype'.`);

    const proccode = procPrototype.mutation.proccode;

    const sb3Args: SB3ProcedureArgumentInfo[] = [];
    const catnipArgs: CatnipScriptTriggerProcedureArgDesc[] = [];

    for (const inputID in procPrototype.inputs) {

        const input = procPrototype.inputs[inputID];
        const inputBlockID = ctx.readBlockID(input);
        const inputBlock = ctx.getBlock(inputBlockID) as 
            ProjectSB3Block<"argument_reporter_string_number"> | ProjectSB3Block<"argument_reporter_boolean">;

        let type: CatnipScriptTriggerProcedureArgTypeDesc;

        if (inputBlock.opcode === "argument_reporter_string_number") {
            type = CatnipScriptTriggerProcedureArgTypeDesc.STRING_OR_NUMBER;
        } else if (inputBlock.opcode === "argument_reporter_boolean") {
            type = CatnipScriptTriggerProcedureArgTypeDesc.BOOLEAN;
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

    return {
        type: "procedure",
        id: procedureID,
        args: catnipArgs
    };
});