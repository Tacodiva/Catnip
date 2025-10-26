
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdMotionSetXY } from "../../compiler/ir0/motion/IR0CmdMotionSetXY";
import { IR0InputMotionGetXY } from "../../compiler/ir0/motion/IR0InputMotionGetXY";
import { IR0InputOperatorAdd } from "../../compiler/ir0/operators/IR0InputOperatorAdd";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type set_y_inputs = { y: CatnipInputOp };

export const op_set_y = new class extends CatnipCommandOpType<set_y_inputs> {
    
    public *getInputsAndSubstacks(inputs: set_y_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.y;
    }

    public generateIr(ctx: IR0Emitter, inputs: set_y_inputs): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdMotionSetXY(
            new IR0InputMotionGetXY("x"),
            ctx.emitInput(inputs.y)
        ));
    }
}

registerSB3CommandBlock("motion_sety", (ctx, block) =>
    op_set_y.create({
        y: ctx.readInput(block.inputs.Y),
    })
);
