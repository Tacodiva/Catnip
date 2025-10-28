import { IR0InputOperatorDiv } from "../../compiler/ir0/operators/IR0InputOperatorDiv";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_div = new CatnipInputBinaryOpType((ctx, inputs) => 
    new IR0InputOperatorDiv(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_divide", (ctx, block) => op_div.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
