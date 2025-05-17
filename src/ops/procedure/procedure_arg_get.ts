
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_procedure_arg_get } from "../../compiler/ir/procedure/procedure_arg_get";
import { ir_procedure_trigger, ir_procedure_trigger_inputs } from "../../compiler/ir/procedure/procedure_trigger";
import { SB3ReadLogger } from "../../sb3_logger";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type procedure_arg_get_inputs = { argName: string, format: CatnipValueFormat };

export const op_procedure_arg_get = new class extends CatnipInputOpType<procedure_arg_get_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_arg_get_inputs) {

        let paramIdx;

        for (paramIdx = ctx.ir.parameters.length - 1; paramIdx >= 0; paramIdx--) {
            if (ctx.ir.parameters[paramIdx].name === inputs.argName) break;
        }

        if (paramIdx === -1) {
            CatnipCompilerLogger.warn(`Can't find parameter with name '${inputs.argName}' in script ${ctx.ir.entrypoint.name}`);

            if (inputs.format === CatnipValueFormat.I32_BOOLEAN) {
                ctx.emitIrConst(false, CatnipValueFormat.I32_BOOLEAN);
            } else {
                SB3ReadLogger.assert(inputs.format === CatnipValueFormat.F64);
                ctx.emitIrConst("", CatnipValueFormat.F64);
            }
        } else {
            ctx.emitIr(ir_procedure_arg_get, { paramIndex: paramIdx }, {});
        }
    }
}

registerSB3InputBlock("argument_reporter_string_number", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    format: CatnipValueFormat.F64
}));

registerSB3InputBlock("argument_reporter_boolean", (ctx, block) => op_procedure_arg_get.create({
    argName: "" + block.fields.VALUE[0],
    format: CatnipValueFormat.I32_BOOLEAN
}));
