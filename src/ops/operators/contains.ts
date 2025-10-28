import { IR0InputOperatorContains } from "../../compiler/ir0/operators/IR0InputOperatorContains";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_contains = new CatnipInputBinaryOpType((ctx, inputs) => 
    new IR0InputOperatorContains(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_contains", (ctx, block) => op_contains.create({
    left: ctx.readInput(block.inputs.STRING1),
    right: ctx.readInput(block.inputs.STRING2),
}));
