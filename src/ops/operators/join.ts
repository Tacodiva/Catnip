import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_join } from "../../compiler/ir/operators/join";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_join = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.I32_HSTRING);
    ctx.emitInput(inputs.right, CatnipValueFormat.I32_HSTRING);
    ctx.emitIr(ir_join, { }, {});
});

registerSB3InputBlock("operator_join", (ctx, block) => op_join.create({
    left: ctx.readInput(block.inputs.STRING1),
    right: ctx.readInput(block.inputs.STRING2),
}));
