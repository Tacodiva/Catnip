import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_and } from "../../compiler/ir/operators/and";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_and = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.I32_BOOLEAN);
    ctx.emitInput(inputs.right, CatnipValueFormat.I32_BOOLEAN);
    ctx.emitIr(ir_and, { }, {});
});

registerSB3InputBlock("operator_and", (ctx, block) => op_and.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
