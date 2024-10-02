
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp, CatnipOpInputs } from "../CatnipOp";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { ir_procedure_arg_set } from "../../compiler/ir/procedure/procedure_arg_set";
import { ir_branch } from "../../compiler/ir/core/branch";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipProcedureID, CatnipProcedureTriggerArgType } from "./procedure_definition";
import { SB3ReadLogger } from "../../sb3_logger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipIrProcedureBranch } from "../../compiler/ir/procedure/CatinpIrProcedureBranch";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { CatnipIr } from "../../compiler/CatnipIr";

type procedure_call_inputs = { sprite: CatnipSpriteID, procedure: CatnipProcedureID, args: { input: CatnipInputOp, format: CatnipValueFormat }[] };

export const op_procedure_call = new class extends CatnipCommandOpType<procedure_call_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: procedure_call_inputs): IterableIterator<CatnipOp> {
        for (const arg of inputs.args) yield arg.input;
    }
    
    public *getExternalBranches(ir: CatnipIr, inputs: procedure_call_inputs): IterableIterator<CatnipIrExternalBranch> {
        yield new CatnipIrProcedureBranch(ir.compiler, inputs.sprite, inputs.procedure);
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_call_inputs): void {
        for (let i = 0; i < inputs.args.length; i++) {
            const argInput = inputs.args[i];

            ctx.emitInput(argInput.input, argInput.format);
            ctx.emitIr(ir_procedure_arg_set, { argIdx: i, sprite: inputs.sprite, procedure: inputs.procedure }, {});
        }

        ctx.emitIr(ir_branch, {}, { branch: new CatnipIrProcedureBranch(ctx.compiler, inputs.sprite, inputs.procedure) });
    }
}

registerSB3CommandBlock("procedures_call", (ctx, block) => {
    const proccode = block.mutation.proccode;
    const procedureInfo = ctx.meta.getProcedure(proccode);

    const argInfos = procedureInfo.args;
    const args: { input: CatnipInputOp, format: CatnipValueFormat }[] = [];

    for (const argInfo of argInfos) {

        const argInputBlock = block.inputs[argInfo.id];
        let argInput: CatnipInputOp;
        let argFormat: CatnipValueFormat;

        if (argInputBlock === undefined) {
            if (argInfo.type === CatnipProcedureTriggerArgType.BOOLEAN) {
                argInput = op_const.create({ value: "false" });
            } else {
                SB3ReadLogger.assert(argInfo.type === CatnipProcedureTriggerArgType.STRING_OR_NUMBER);
                argInput = op_const.create({ value: "" });
            }
        } else {
            argInput = ctx.readInput(argInputBlock);
        }

        if (argInfo.type === CatnipProcedureTriggerArgType.BOOLEAN)
            argFormat = CatnipValueFormat.I32_BOOLEAN;
        else argFormat = CatnipValueFormat.F64;

        args.push({input: argInput, format: argFormat});
    }

    return op_procedure_call.create({
        sprite: ctx.spriteDesc.id,
        procedure: procedureInfo.procedureID,
        args
    });
});