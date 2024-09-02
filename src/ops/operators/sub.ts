import { SpiderNumberType } from "wasm-spider";
import { ir_sub } from "../../compiler/ir/operators/sub";
import { CatnipInputOp, CatnipInputOpType } from "../CatnipOp";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/types";

export type sub_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_sub = new class extends CatnipInputOpType<sub_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: sub_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_sub, { type: SpiderNumberType.f64 }, {});
    }
}
