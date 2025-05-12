import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_not } from "../../compiler/ir/operators/not";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_not = new CatnipInputUnaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.value, CatnipValueFormat.I32_BOOLEAN);
    ctx.emitIr(ir_not, { }, {});
});

registerSB3InputBlock("operator_not", (ctx, block) => op_not.create({
    value: ctx.readInput(block.inputs.OPERAND ?? null),
}));
