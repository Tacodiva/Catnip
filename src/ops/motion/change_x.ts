
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdMotionSetXY } from "../../compiler/ir0/motion/IR0CmdMotionSetXY";
import { IR0InputMotionGetXY } from "../../compiler/ir0/motion/IR0InputMotionGetXY";
import { IR0InputOperatorAdd } from "../../compiler/ir0/operators/IR0InputOperatorAdd";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type change_x_inputs = { x: CatnipInputOp };

export const op_change_x = new class extends CatnipCommandOpType<change_x_inputs> {
    
    public *getInputsAndSubstacks(inputs: change_x_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.x;
    }

    public generateIr(ctx: IR0Emitter, inputs: change_x_inputs): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdMotionSetXY(
            new IR0InputOperatorAdd(new IR0InputMotionGetXY("x"), ctx.emitInput(inputs.x)),
            new IR0InputMotionGetXY("y")
        ));
    }
}

registerSB3CommandBlock("motion_changexby", (ctx, block) =>
    op_change_x.create({
        x: ctx.readInput(block.inputs.DX),
    })
);
