
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputSensingTimerGet } from "../../compiler/ir0/sensing/IR0InputSensingTimerGet";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";


export const op_timer_get = new class extends CatnipInputOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> { }

    public generateIr(ctx: IR0Emitter, inputs: {}): IR0Input {
        return new IR0InputSensingTimerGet();
    }
}


registerSB3InputBlock("sensing_timer", (ctx, block) =>
    op_timer_get.create({})
);