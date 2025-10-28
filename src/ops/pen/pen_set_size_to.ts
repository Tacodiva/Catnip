import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdPenSetSize } from "../../compiler/ir0/pen/IR0CmdPenSetSize";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type pen_set_size_to = { size: CatnipInputOp };


export const op_pen_set_size_to = new class extends CatnipCommandOpType<pen_set_size_to> {
    public *getInputsAndSubstacks(inputs: pen_set_size_to): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.size;
    }

    public generateIr(ctx: IR0Emitter, inputs: pen_set_size_to): void {
        ctx.emitCommand(new IR0CmdPenSetSize(ctx.emitInput(inputs.size)));
    }
}


registerSB3CommandBlock("pen_setPenSizeTo", (ctx, block) => 
    op_pen_set_size_to.create({
        size: ctx.readInput(block.inputs.SIZE)
    })
);