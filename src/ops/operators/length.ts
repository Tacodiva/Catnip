import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_join } from "../../compiler/ir/operators/join";
import { ir_length } from "../../compiler/ir/operators/length";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_length = new CatnipInputUnaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.value, CatnipValueFormat.I32_HSTRING);
    ctx.emitIr(ir_length, { }, {});
});

registerSB3InputBlock("operator_length", (ctx, block) => op_length.create({
    value: ctx.readInput(block.inputs.STRING),
}));
