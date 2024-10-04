import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";
import { ir_mul } from "../../compiler/ir/operators/mul";

export type mul_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_mul = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
    ctx.emitIr(ir_mul, { }, {});
});

registerSB3InputBlock("operator_multiply", (ctx, block) => op_mul.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
