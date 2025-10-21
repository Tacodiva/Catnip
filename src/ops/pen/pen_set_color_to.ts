import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdPenSetColor } from "../../compiler/ir0/pen/IR0CmdPenSetColor";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type pen_set_color_to = { color: CatnipInputOp };


export const op_pen_set_color_to = new class extends CatnipCommandOpType<pen_set_color_to> {
    public *getInputsAndSubstacks(inputs: pen_set_color_to): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.color;
    }

    public generateIr(ctx: IR0Emitter, inputs: pen_set_color_to): void {
        ctx.emitCommand(new IR0CmdPenSetColor(ctx.emitInput(inputs.color)));
    }
}


registerSB3CommandBlock("pen_setPenColorToColor", (ctx, block) => 
    op_pen_set_color_to.create({
        color: ctx.readInput(block.inputs.COLOR)
    })
);