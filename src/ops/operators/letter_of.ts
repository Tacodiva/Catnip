import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "..";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_letter_of } from "../../compiler/ir/operators/letter_of";
import { registerSB3InputBlock } from "../../sb3_ops";

export type letter_of_inputs = { string: CatnipInputOp, letter: CatnipInputOp };

export const op_letter_of = new class extends CatnipInputOpType<letter_of_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: letter_of_inputs): IterableIterator<CatnipOp> {
        yield inputs.string;
        yield inputs.letter;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: letter_of_inputs) {
        ctx.emitInput(inputs.string, CatnipValueFormat.I32_HSTRING);
        ctx.emitInput(inputs.letter, CatnipValueFormat.I32_NUMBER);
        ctx.emitIr(ir_letter_of, {}, {})
    }
}

registerSB3InputBlock("operator_letter_of", (ctx, block) => op_letter_of.create({
    string: ctx.readInput(block.inputs.STRING),
    letter: ctx.readInput(block.inputs.LETTER),
}));
