import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdPenDown } from "../../compiler/ir0/pen/IR0CmdPenDown";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

export const op_pen_down = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> {}

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitCommand(new IR0CmdPenDown());
    }
}


registerSB3CommandBlock("pen_penDown", (ctx, block) => 
    op_pen_down.create({})
);