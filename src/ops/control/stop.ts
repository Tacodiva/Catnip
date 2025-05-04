import { CatnipCommandOpType, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock, registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { SB3BlockControlStopOption } from "../../sb3";

export type stop_inputs = { type: SB3BlockControlStopOption };

export const op_stop = new class extends CatnipCommandOpType<stop_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: stop_inputs) {
        switch (inputs.type) {
            case SB3BlockControlStopOption.THIS_SCRIPT:
                // It's up to the trigger to stop this script
                ctx.ir.trigger.type.postIR(ctx, ctx.ir.trigger.inputs);
                break;
            default:
                throw new Error(`Stop option not valid '${inputs.type}'.`);
        }
    }
}

registerSB3CommandBlock("control_stop", (ctx, block) => op_stop.create({
    type: block.fields.STOP_OPTION[0]
}));
