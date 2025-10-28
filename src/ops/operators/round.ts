import { IR0InputOperatorRound } from "../../compiler/ir0/operators/IR0InputOperatorRound";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputUnaryOpType } from "./UnaryOperator";

export const op_round = new CatnipInputUnaryOpType((ctx, input) => 
    new IR0InputOperatorRound(ctx.emitInput(input))
);

registerSB3InputBlock("operator_round", (ctx, block) => op_round.create({
    value: ctx.readInput(block.inputs.NUM),
}));
