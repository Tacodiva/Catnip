
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";
import { CatnipProcedureID, CatnipScriptTriggerProcedureArgTypeDesc } from "../../runtime/CatnipScript";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { ir_procedure_arg_set } from "../../compiler/ir/procedure/procedure_arg_set";
import { ir_branch } from "../../compiler/ir/core/branch";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { SB3ReadMetadata } from "../../sb3_reader";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";

type procedure_call_inputs = { sprite: CatnipSpriteID, procedure: CatnipProcedureID, args: CatnipInputOp[] };

export const op_procedure_call = new class extends CatnipCommandOpType<procedure_call_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_call_inputs): void {
        const procedureInfo = ctx.compiler.getProcedureInfo(inputs.sprite, inputs.procedure);
        CatnipCompilerLogger.assert(procedureInfo.ir !== null, true, "Procedure IR unavaliable.");

        CatnipCompilerLogger.assert(inputs.args.length === procedureInfo.args.length);

        for (let i = 0; i < inputs.args.length; i++) {
            const argInfo = procedureInfo.args[i];
            const argInput = inputs.args[i];

            ctx.emitInput(argInput, argInfo.format);
            ctx.emitIr(ir_procedure_arg_set, { argIdx: i, sprite: inputs.sprite, procedure: inputs.procedure }, {});
        }

        ctx.emitIr(ir_branch, {}, { branch: procedureInfo.ir.entrypoint.body });
    }
}

registerSB3CommandBlock("procedures_call", (ctx, block) => {
    const proccode = block.mutation.proccode;
    const procedureInfo = ctx.meta.getProcedure(proccode);

    const argInfos = procedureInfo.args;
    const args: CatnipInputOp[] = [];

    for (const argInfo of argInfos) {

        const argInputBlock = block.inputs[argInfo.id];
        let argInput: CatnipInputOp;

        if (argInputBlock === undefined) {
            if (argInfo.type === CatnipScriptTriggerProcedureArgTypeDesc.BOOLEAN) {
                argInput = op_const.create({ value: "false" });
            } else {
                SB3ReadMetadata.Logger.assert(argInfo.type === CatnipScriptTriggerProcedureArgTypeDesc.STRING_OR_NUMBER);
                argInput = op_const.create({ value: "" });
            }
        } else {
            argInput = ctx.readInput(argInputBlock);
        }

        args.push(argInput);
    }

    return op_procedure_call.create({
        sprite: ctx.spriteDesc.id,
        procedure: procedureInfo.procedureID,
        args
    });
});