import { IR0InputOperatorOr } from "../../compiler/ir0/operators/IR0InputOperatorOr";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_or = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorOr(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_or", (ctx, block) => op_or.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
