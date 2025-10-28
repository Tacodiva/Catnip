
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdSensingTimerReset } from '../../compiler/ir0/sensing/IR0CmdSensingTimerReset';
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";


export const op_timer_reset = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> {}

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitCommand(new IR0CmdSensingTimerReset());
    }

}


registerSB3CommandBlock("sensing_resettimer", (ctx, block) => 
    op_timer_reset.create({})
);