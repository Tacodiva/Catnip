import { IR0InputOperatorCmpGt } from "../../compiler/ir0/operators/IR0InputOperatorCmpGt";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_gt = new CatnipInputBinaryOpType((ctx, inputs) => {
    return new IR0InputOperatorCmpGt(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right));
});

registerSB3InputBlock("operator_gt", (ctx, block) => op_gt.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
