import { ir_sub } from "../../compiler/ir/operators/sub";
import { CatnipInputOp } from "../CatnipOp";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export type sub_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_sub = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
    ctx.emitIr(ir_sub, { }, {});
});

registerSB3InputBlock("operator_subtract", (ctx, block) => op_sub.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
