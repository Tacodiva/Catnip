
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_get_var } from "../../compiler/ir/data/get_var";
import { CatnipProcedureID, CatnipScriptTriggerProcedureArgTypeDesc } from "../../runtime/CatnipScript";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3InputBlock } from "../../sb3_ops";
import { SB3ReadMetadata } from "../../sb3_reader";
import { CatnipInputOpType } from "../CatnipOp";

type procedure_arg_get_inputs = { argName: string, type: CatnipScriptTriggerProcedureArgTypeDesc };

export const op_procedure_arg_get = new class extends CatnipInputOpType<procedure_arg_get_inputs> {

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_arg_get_inputs) {
        const procedureArguments = ctx.ir.procedureArguments;

        let argIdx;

        for (argIdx = procedureArguments.length - 1; argIdx >= 0; argIdx--) {
            if (procedureArguments[argIdx].name === inputs.argName) break;
        }

        if (argIdx === -1) {
            CatnipCompilerLogger.warn(`Can't find procedure argument with name '${inputs.argName}'`);

            if (inputs.type === CatnipScriptTriggerProcedureArgTypeDesc.BOOLEAN) {
                ctx.emitIr<typeof ir_const>(ir_const, { value: "false", format: CatnipValueFormat.I32_BOOLEAN }, {});
            } else {
                SB3ReadMetadata.Logger.assert(inputs.type === CatnipScriptTriggerProcedureArgTypeDesc.STRING_OR_NUMBER);
                ctx.emitIr<typeof ir_const>(ir_const, { value: "", format: CatnipValueFormat.I32_HSTRING }, {});
            }
        } else {
            const argVariable = procedureArguments[argIdx];
            ctx.emitIr(ir_transient_load, { transient: argVariable }, {});
        }
    }
}

registerSB3InputBlock("argument_reporter_string_number", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    type: CatnipScriptTriggerProcedureArgTypeDesc.STRING_OR_NUMBER
}));

registerSB3InputBlock("argument_reporter_boolean", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    type: CatnipScriptTriggerProcedureArgTypeDesc.BOOLEAN
}));
