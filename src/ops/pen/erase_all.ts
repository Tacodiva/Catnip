import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdPenClear } from "../../compiler/ir0/pen/IR0CmdPenClear";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";


export const op_erase_all = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> { }

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdPenClear());
    }

}


registerSB3CommandBlock("pen_clear", (ctx, block) =>
    op_erase_all.create({})
);