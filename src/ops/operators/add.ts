import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp, CatnipInputOpType } from "../CatnipOp";
import { ir_add } from "../../compiler/ir/operators/add";
import { registerSB3InputBlock } from "../../sb3_ops";

export type add_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_add = new class extends CatnipInputOpType<add_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: add_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_add, { type: SpiderNumberType.f64 }, {});
    }
}

registerSB3InputBlock("operator_add", (ctx, block) => op_add.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
