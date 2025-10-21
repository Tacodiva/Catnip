import { IR0InputOperatorCmpLt } from "../../compiler/ir0/operators/IR0InputOperatorCmpLt";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_lt = new CatnipInputBinaryOpType((ctx, inputs) => {
    return new IR0InputOperatorCmpLt(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right));
});

registerSB3InputBlock("operator_lt", (ctx, block) => op_lt.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
