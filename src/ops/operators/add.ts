import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp } from "../CatnipOp";
import { ir_add } from "../../compiler/ir/operators/add";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";

export type add_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_add = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
    ctx.emitIr(ir_add, { }, {});
});

registerSB3InputBlock("operator_add", (ctx, block) => op_add.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
