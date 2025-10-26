
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdMotionSetXY } from "../../compiler/ir0/motion/IR0CmdMotionSetXY";
import { IR0InputMotionGetXY } from "../../compiler/ir0/motion/IR0InputMotionGetXY";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type set_x_inputs = { x: CatnipInputOp };

export const op_set_x = new class extends CatnipCommandOpType<set_x_inputs> {
    
    public *getInputsAndSubstacks(inputs: set_x_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.x;
    }

    public generateIr(ctx: IR0Emitter, inputs: set_x_inputs): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdMotionSetXY(
            ctx.emitInput(inputs.x),
            new IR0InputMotionGetXY("y")
        ));
    }
}

registerSB3CommandBlock("motion_setx", (ctx, block) =>
    op_set_x.create({
        x: ctx.readInput(block.inputs.X),
    })
);
