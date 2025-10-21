import { IR0InputOperatorNot } from "../../compiler/ir0/operators/IR0InputOperatorNot";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_not = new CatnipInputUnaryOpType(
    (ctx, input) => new IR0InputOperatorNot(ctx.emitInput(input))
);

registerSB3InputBlock("operator_not", (ctx, block) => op_not.create({
    value: ctx.readInput(block.inputs.OPERAND ?? null),
}));
