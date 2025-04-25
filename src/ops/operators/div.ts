import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";
import { ir_div } from "../../compiler/ir/operators/div";

export type div_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_div = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
    ctx.emitIr(ir_div, { }, {});
});

registerSB3InputBlock("operator_divide", (ctx, block) => op_div.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
