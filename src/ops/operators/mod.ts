import { IR0InputOperatorMod } from "../../compiler/ir0/operators/IR0InputOperatorMod";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_mod = new CatnipInputBinaryOpType((ctx, inputs) => 
    new IR0InputOperatorMod(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_mod", (ctx, block) => op_mod.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
