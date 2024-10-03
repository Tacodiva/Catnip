import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_cmp_eq } from "../../compiler/ir/operators/cmp_eq";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_equals = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64);
    ctx.emitIr(ir_cmp_eq, { }, {});
});

registerSB3InputBlock("operator_equals", (ctx, block) => op_equals.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
