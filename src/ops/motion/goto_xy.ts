
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdMotionSetXY } from "../../compiler/ir0/motion/IR0CmdMotionSetXY";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type goto_xy_inputs = { x: CatnipInputOp, y: CatnipInputOp };

export const op_goto_xy = new class extends CatnipCommandOpType<goto_xy_inputs> {
    public *getInputsAndSubstacks(inputs: goto_xy_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.x;
        yield inputs.y;
    }
    
    public generateIr(ctx: IR0Emitter, inputs: goto_xy_inputs): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdMotionSetXY(
            ctx.emitInput(inputs.x),
            ctx.emitInput(inputs.y)
        ))
    }
}

registerSB3CommandBlock("motion_gotoxy", (ctx, block) =>
    op_goto_xy.create({
        x: ctx.readInput(block.inputs.X),
        y: ctx.readInput(block.inputs.Y),
    })
);
