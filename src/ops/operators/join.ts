import { IR0InputJoin } from "../../compiler/ir0/ops/IR0InputJoin";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export const op_join = new CatnipInputBinaryOpType((ctx, inputs) => {
    return new IR0InputJoin(
        ctx.emitInput(inputs.left),  
        ctx.emitInput(inputs.right)
    );
});

registerSB3InputBlock("operator_join", (ctx, block) => op_join.create({
    left: ctx.readInput(block.inputs.STRING1),
    right: ctx.readInput(block.inputs.STRING2),
}));
