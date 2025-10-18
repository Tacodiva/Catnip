
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../compiler/CatnipValueFormatUtils";
import { IR0Script } from "../../compiler/ir0/IR0Script";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { SB3ToIR0Info } from "../../compiler/ir0/SB3ToIR0Info";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { SB3ReadLogger } from "../../sb3_logger";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { op_breakpoint } from "../core/breakpoint";
import { op_const } from "../core/const";
import { op_log } from "../core/log";
import { op_nop } from "../core/nop";
import { CatnipProcedureID } from "./procedure_definition";

type procedure_call_inputs = {
    sprite: CatnipSpriteID,
    procedure: CatnipProcedureID,
    // Is the target procedure warp?
    procedureIsWarp: boolean,
    args: { input: CatnipInputOp, format: CatnipValueFormat }[]
};

export const op_procedure_call = new class extends CatnipCommandOpType<procedure_call_inputs> {

    public *getInputsAndSubstacks(inputs: procedure_call_inputs) {
        yield* inputs.args.map(arg => arg.input);
    }

    public prepass(script: IR0Script, conversionInfo: SB3ToIR0Info, inputs: procedure_call_inputs): void {
        // In the pre-analysis phase, we make sure the right varient of the procedure exists
        this._getTarget(script, conversionInfo, inputs);
        
        super.prepass(script, conversionInfo, inputs);
    }

    private _getTarget(script: IR0Script, conversionInfo: SB3ToIR0Info, inputs: procedure_call_inputs): IR0Script {
        return conversionInfo.getIR0Procedure(inputs.sprite, inputs.procedure, inputs.procedureIsWarp || script.trigger.isWarp);
    }

    public generateIr(ctx: IR0Emitter, inputs: procedure_call_inputs): void {
        ctx.emitCall(
            this._getTarget(ctx.ir0Script, ctx.conversionInfo, inputs),
            inputs.args.map(arg => ctx.emitInput(arg.input))
        );
    }
}

registerSB3CommandBlock("procedures_call", (ctx, block) => {
    const proccode = block.mutation.proccode;
    const procedureInfo = ctx.meta.getProcedure(proccode);

    if (procedureInfo === null) {

        switch (proccode) {
            case "\u200B\u200Blog\u200B\u200B %s":
                return op_log.create({ msg: ctx.readInput(block.inputs[Object.keys(block.inputs)[0]]), type: "info" });
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