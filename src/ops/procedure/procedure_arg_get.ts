
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { CatnipIrProcedureTriggerArg, ir_procedure_trigger, ir_procedure_trigger_inputs } from "../../compiler/ir/procedure/procedure_trigger";
import { SB3ReadLogger } from "../../sb3_logger";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { CatnipProcedureTriggerArgType } from "./procedure_definition";

type procedure_arg_get_inputs = { argName: string, type: CatnipProcedureTriggerArgType };

export const op_procedure_arg_get = new class extends CatnipInputOpType<procedure_arg_get_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_arg_get_inputs) {

        const trigger = ctx.ir.trigger;

        let procedureArguments: CatnipIrProcedureTriggerArg[];

        if (trigger.type !== ir_procedure_trigger) {
            procedureArguments = [];
        } else {
            procedureArguments = (ctx.ir.trigger.inputs as ir_procedure_trigger_inputs).args;
        }

        let argIdx;

        for (argIdx = procedureArguments.length - 1; argIdx >= 0; argIdx--) {
            if (procedureArguments[argIdx].name === inputs.argName) break;
        }

        if (argIdx === -1) {
            CatnipCompilerLogger.warn(`Can't find procedure argument with name '${inputs.argName}'`);

            if (inputs.type === CatnipProcedureTriggerArgType.BOOLEAN) {
                ctx.emitIr<typeof ir_const>(ir_const, { value: false, format: CatnipValueFormat.I32_BOOLEAN }, {});
            } else {
                SB3ReadLogger.assert(inputs.type === CatnipProcedureTriggerArgType.STRING_OR_NUMBER);
                ctx.emitIr<typeof ir_const>(ir_const, { value: "", format: CatnipValueFormat.I32_HSTRING }, {});
            }
        } else {
            const argVariable = procedureArguments[argIdx].variable;
            ctx.emitIr(ir_transient_load, { transient: argVariable }, {});
        }
    }
}

registerSB3InputBlock("argument_reporter_string_number", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    type: CatnipProcedureTriggerArgType.STRING_OR_NUMBER
}));

registerSB3InputBlock("argument_reporter_boolean", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    type: CatnipProcedureTriggerArgType.BOOLEAN
}));
