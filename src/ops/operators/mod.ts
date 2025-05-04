import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputBinaryOpType } from "./BinaryOperator";
import { ir_mod } from "../../compiler/ir/operators/mod";

export const op_mod = new CatnipInputBinaryOpType((ctx, inputs) => {
    ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
    ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
    ctx.emitIr(ir_mod, { }, {});
});

registerSB3InputBlock("operator_mod", (ctx, block) => op_mod.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
