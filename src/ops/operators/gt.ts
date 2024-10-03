import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";
import { ir_cmp_gt } from "../../compiler/ir/operators/cmp_gt";

export const op_gt = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64);
    ctx.emitIr(ir_cmp_gt, { }, {});
});

registerSB3InputBlock("operator_gt", (ctx, block) => op_gt.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
