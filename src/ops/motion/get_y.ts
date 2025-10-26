import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputMotionGetXY } from "../../compiler/ir0/motion/IR0InputMotionGetXY";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export const op_get_y = new class extends CatnipInputOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> {}
    
    public generateIr(ctx: IR0Emitter, inputs: {}): IR0Input {
        return new IR0InputMotionGetXY("y");
    }

}

registerSB3InputBlock("motion_yposition", (ctx, block) => op_get_y.create({}));
