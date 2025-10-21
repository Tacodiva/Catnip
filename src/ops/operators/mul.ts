import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";
import { ir_mul } from "../../compiler/ir/operators/mul";
import { IR0InputOperatorMul } from "../../compiler/ir0/operators/IR0InputOperatorMul";

export const op_mul = new CatnipInputBinaryOpType(
    (ctx, inputs) => new IR0InputOperatorMul(ctx.emitInput(inputs.left), ctx.emitInput(inputs.right))
);

registerSB3InputBlock("operator_multiply", (ctx, block) => op_mul.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
