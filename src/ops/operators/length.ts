import { IR0InputOperatorLength } from "../../compiler/ir0/operators/IR0InputOperatorLength";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_length = new CatnipInputUnaryOpType((ctx, input) => 
    new IR0InputOperatorLength(ctx.emitInput(input))
);

registerSB3InputBlock("operator_length", (ctx, block) => op_length.create({
    value: ctx.readInput(block.inputs.STRING),
}));
