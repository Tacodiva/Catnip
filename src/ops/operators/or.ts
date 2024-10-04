import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_or } from "../../compiler/ir/operators/or";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_or = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.I32_BOOLEAN);
    ctx.emitInput(inputs.right, CatnipValueFormat.I32_BOOLEAN);
    ctx.emitIr(ir_or, { }, {});
});

registerSB3InputBlock("operator_or", (ctx, block) => op_or.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
