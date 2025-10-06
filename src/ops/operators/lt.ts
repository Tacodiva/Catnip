// import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
// import { registerSB3InputBlock } from "../../sb3_ops";
// import { ir_cmp_lt } from "../../compiler/ir/operators/cmp_lt";
// import { CatnipInputBinaryOpType } from "./BinaryOperator";

// export const op_lt = new CatnipInputBinaryOpType((ctx, inputs) => {
//     ctx.emitInput(inputs.left, CatnipValueFormat.F64);
//     ctx.emitInput(inputs.right, CatnipValueFormat.F64);
//     ctx.emitIr(ir_cmp_lt, { }, {});
// });

// registerSB3InputBlock("operator_lt", (ctx, block) => op_lt.create({
//     left: ctx.readInput(block.inputs.OPERAND1),
//     right: ctx.readInput(block.inputs.OPERAND2),
// }));
