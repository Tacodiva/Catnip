import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputOperatorLetterOf } from "../../compiler/ir0/operators/IR0InputOperatorLetterOf";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export type letter_of_inputs = { string: CatnipInputOp, letter: CatnipInputOp };

export const op_letter_of = new class extends CatnipInputOpType<letter_of_inputs> {
    public *getInputsAndSubstacks(inputs: letter_of_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.string;
        yield inputs.letter;
    }

    public generateIr(ctx: IR0Emitter, inputs: letter_of_inputs): IR0Input {
        return new IR0InputOperatorLetterOf(
            ctx.emitInput(inputs.letter),
            ctx.emitInput(inputs.string)
        );
    }
}

registerSB3InputBlock("operator_letter_of", (ctx, block) => op_letter_of.create({
    string: ctx.readInput(block.inputs.STRING),
    letter: ctx.readInput(block.inputs.LETTER),
}));
