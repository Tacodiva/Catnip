import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_random } from "../../compiler/ir/operators/random";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_random = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64);
    ctx.emitIr(ir_random, {}, {});
});

registerSB3InputBlock("operator_random", (ctx, block) => op_random.create({
    left: ctx.readInput(block.inputs.FROM),
    right: ctx.readInput(block.inputs.TO),
}));
