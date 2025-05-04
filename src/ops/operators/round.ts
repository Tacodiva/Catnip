import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_not } from "../../compiler/ir/operators/not";
import { ir_round } from "../../compiler/ir/operators/round";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_round = new CatnipInputUnaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.value, CatnipValueFormat.F64_INT);
    ctx.emitIr(ir_round, { }, {});
});

registerSB3InputBlock("operator_round", (ctx, block) => op_round.create({
    value: ctx.readInput(block.inputs.NUM),
}));
