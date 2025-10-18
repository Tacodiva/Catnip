
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { IR0Input } from "../../compiler/ir0/IR0";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputConst } from "../../compiler/ir0/ops/IR0InputConst";
import { IR0InputProcedureArgument } from "../../compiler/ir0/ops/IR0InputProcedureArgument";
import { IR0TriggerProcedure } from "../../compiler/ir0/ops/IR0TriggerProcedure";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType } from "../CatnipOp";

type procedure_arg_get_inputs = { argName: string, format: CatnipValueFormat };

export const op_procedure_arg_get = new class extends CatnipInputOpType<procedure_arg_get_inputs> {
    public *getInputsAndSubstacks(inputs: procedure_arg_get_inputs) { }

    public generateIr(ctx: IR0Emitter, inputs: procedure_arg_get_inputs): IR0Input {

        function findParameterIndex(): number {
            const scriptTrigger = ctx.ir0Script.trigger;

            if (!(scriptTrigger instanceof IR0TriggerProcedure)) {
                return -1;
            }

            for (let paramIdx = scriptTrigger.args.length - 1; paramIdx >= 0; paramIdx--) {
                if (scriptTrigger.args[paramIdx].name === inputs.argName)
                    return paramIdx;
            }

            return -1;
        }

        const paramIdx = findParameterIndex();

        if (paramIdx === -1) {
            CatnipCompilerLogger.warn(`Can't find parameter with name '${inputs.argName}' in script.`);

            if (inputs.format === CatnipValueFormat.I32_BOOLEAN) {
                return new IR0InputConst(false, CatnipValueFormat.I32_BOOLEAN);
            } else {
                return new IR0InputConst("", CatnipValueFormat.F64);
            }
        }

        return new IR0InputProcedureArgument(paramIdx);
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
