import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFlags, CatnipValueFormat } from "../../compiler/types";
import { CatnipInputOp, CatnipInputOpType } from "../CatnipOp";
import { ir_add } from "../../compiler/ir/operators/add";

export type add_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_add = new class extends CatnipInputOpType<add_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: add_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.f64, CatnipValueFlags.NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.f64, CatnipValueFlags.NUMBER);
        ctx.emitIr(ir_add, { type: SpiderNumberType.f64 }, {});
    }
}
