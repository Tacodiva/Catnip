import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_and } from "../../compiler/ir/operators/and";
import { ir_contains } from "../../compiler/ir/operators/contains";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_contains = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.I32_HSTRING);
    ctx.emitInput(inputs.right, CatnipValueFormat.I32_HSTRING);
    ctx.emitIr(ir_contains, { }, {});
});

registerSB3InputBlock("operator_contains", (ctx, block) => op_contains.create({
    left: ctx.readInput(block.inputs.STRING1),
    right: ctx.readInput(block.inputs.STRING2),
}));
