import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { SB3BlockControlStopOption } from "../../sb3";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType } from "../CatnipOp";

export type stop_inputs = { type: SB3BlockControlStopOption };

export const op_stop = new class extends CatnipCommandOpType<stop_inputs> {
    public *getInputsAndSubstacks(inputs: stop_inputs) { }

    public generateIr(ctx: IR0Emitter, inputs: stop_inputs): void {
        switch (inputs.type) {
            case SB3BlockControlStopOption.THIS_SCRIPT:
                ctx.emitReturn();
                break;
            default:
                throw new Error(`Stop option not valid '${inputs.type}'.`);
        }
    }
}

registerSB3CommandBlock("control_stop", (ctx, block) => op_stop.create({
    type: block.fields.STOP_OPTION[0]
}));
