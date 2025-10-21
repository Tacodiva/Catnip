import { IR0InputOperatorSub } from "../../compiler/ir0/operators/IR0InputOperatorSub";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_sub = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorSub(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_subtract", (ctx, block) => op_sub.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
