
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp, CatnipOpInputs } from "../CatnipOp";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { ir_procedure_arg_set } from "../../compiler/ir/procedure/procedure_arg_set";
import { ir_branch } from "../../compiler/ir/core/branch";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { op_const } from "../core/const";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipProcedureID, procedure_trigger } from "./procedure_definition";
import { SB3ReadLogger } from "../../sb3_logger";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipIrProcedureBranch } from "../../compiler/ir/procedure/CatinpIrProcedureBranch";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { CatnipIr } from "../../compiler/CatnipIr";
import { op_nop } from "../core/nop";
import { op_log } from "../core/log";
import { CatnipCompilerProcedureSubsystem } from "../../compiler/subsystems/CatnipCompilerProcedureSubsystem";
import { CatnipIrScriptProcedureTrigger } from "../../compiler/ir/procedure/procedure_trigger";
import { CatnipValueFormatUtils } from "../../compiler/CatnipValueFormatUtils";
import { op_breakpoint } from "../core/breakpoint";
import { CatnipCompiler } from "../../compiler/CatnipCompiler";

type procedure_call_inputs = {
    sprite: CatnipSpriteID,
    procedure: CatnipProcedureID,
    // Is the target procedure warp?
    procedureIsWarp: boolean,
    args: { input: CatnipInputOp, format: CatnipValueFormat }[]
};

export const op_procedure_call = new class extends CatnipCommandOpType<procedure_call_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: procedure_call_inputs): IterableIterator<CatnipOp> {
        for (const arg of inputs.args) yield arg.input;
    }

    public *getExternalBranches(ir: CatnipIr, inputs: procedure_call_inputs): IterableIterator<CatnipIrExternalBranch> {
        yield new CatnipIrProcedureBranch(ir.compiler, inputs.sprite, inputs.procedure, ir.isWarp || inputs.procedureIsWarp);
    }

    public preAnalyze(ir: CatnipIr, inputs: procedure_call_inputs): void {
        // In the pre-analysis phase, we make sure the right varient of the procedure exists
        this._getTarget(ir, inputs);
    }

    private _getTarget(ir: CatnipIr, inputs: procedure_call_inputs): CatnipIr {
        const subsystem = ir.compiler.getSubsystem(CatnipCompilerProcedureSubsystem);

        if (ir.isWarp && !inputs.procedureIsWarp) {
            // We need to make sure a warp varient of the procedure exists.
            let varient = subsystem.tryGetProcedureInfo(inputs.sprite, inputs.procedure, true);

            if (varient === undefined) {
                // The varient doesn't exit, let's create it!
                const noWarpVarient = subsystem.getProcedureInfo(inputs.sprite, inputs.procedure, false);

                return ir.compiler.createIR({
                    commands: noWarpVarient.ir.commands,
                    scriptID: noWarpVarient.ir.scriptID,
                    spriteID: noWarpVarient.ir.spriteID,
                    trigger: procedure_trigger.create({
                        id: inputs.procedure,
                        args: (noWarpVarient.ir.trigger as CatnipIrScriptProcedureTrigger).inputs.args,
                        warp: true
                    })
                });
            } else {
                return varient.ir;
            }
        }

        return subsystem.getProcedureInfo(inputs.sprite, inputs.procedure, inputs.procedureIsWarp).ir;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: procedure_call_inputs): void {

        const target = this._getTarget(ctx.ir, inputs);

        for (let i = 0; i < inputs.args.length; i++) {
            const argInput = inputs.args[i];

            ctx.emitInput(argInput.input, argInput.format);
            ctx.emitIr(ir_procedure_arg_set, { target, argIdx: i }, {});
        }

        ctx.emitIr(ir_branch, {}, { branch: new CatnipIrProcedureBranch(ctx.compiler, target.spriteID, inputs.procedure, target.isWarp) });
    }
}

registerSB3CommandBlock("procedures_call", (ctx, block) => {
    const proccode = block.mutation.proccode;
    const procedureInfo = ctx.meta.getProcedure(proccode);

    if (procedureInfo === null) {

        switch (proccode) {
            case "\u200B\u200Blog\u200B\u200B %s":
                return op_log.create({ msg: ctx.readInput(block.inputs[Object.keys(block.inputs)[0]]), type: "log" });
            case "\u200B\u200Bwarn\u200B\u200B %s":
                return op_log.create({ msg: ctx.readInput(block.inputs[Object.keys(block.inputs)[0]]), type: "warn" });
            case "\u200B\u200Berror\u200B\u200B %s":
                return op_log.create({ msg: ctx.readInput(block.inputs[Object.keys(block.inputs)[0]]), type: "error" });
            case "\u200B\u200Bbreakpoint\u200B\u200B":
                return op_breakpoint.create({});
        }

        CatnipCompilerLogger.warn(`Unknown procedure opcode '${proccode}'.`);
        return op_nop.create({});
    }

    const argInfos = procedureInfo.args;
    const args: { input: CatnipInputOp, format: CatnipValueFormat }[] = [];

    for (const argInfo of argInfos) {

        const argInputBlock = block.inputs[argInfo.id];
        let argInput: CatnipInputOp;

        if (argInputBlock === undefined) {
            if (CatnipValueFormatUtils.isAlways(argInfo.format, CatnipValueFormat.I32_BOOLEAN)) {
                argInput = op_const.create({ value: false });
            } else {
                SB3ReadLogger.assert(CatnipValueFormatUtils.isSometimes(argInfo.format, CatnipValueFormat.F64));
                argInput = op_const.create({ value: "" });
            }
        } else {
            argInput = ctx.readInput(argInputBlock);
        }

        args.push({ input: argInput, format: argInfo.format });
    }

    return op_procedure_call.create({
        sprite: ctx.spriteDesc.id,
        procedure: procedureInfo.procedureID,
        procedureIsWarp: procedureInfo.warp,
        args
    });
});