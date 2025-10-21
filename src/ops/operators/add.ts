import { IR0InputOperatorAdd } from "../../compiler/ir0/operators/IR0InputOperatorAdd";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_add = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorAdd(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_add", (ctx, block) => op_add.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
