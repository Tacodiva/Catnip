import { IR0InputOperatorAnd } from "../../compiler/ir0/operators/IR0InputOperatorAnd";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_and = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorAnd(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_and", (ctx, block) => op_and.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
