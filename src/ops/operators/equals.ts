import { IR0InputOperatorCmpEq } from "../../compiler/ir0/operators/IR0InputOperatorCmpEq";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_equals = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorCmpEq(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_equals", (ctx, block) => op_equals.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
