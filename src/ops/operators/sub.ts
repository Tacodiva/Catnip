import { SpiderNumberType } from "wasm-spider";
import { ir_sub } from "../../compiler/ir/operators/sub";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";

export type sub_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_sub = new class extends CatnipInputOpType<sub_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: sub_inputs): IterableIterator<CatnipOp> {
        yield inputs.left;
        yield inputs.right;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: sub_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_sub, { type: SpiderNumberType.f64 }, {});
    }
}

registerSB3InputBlock("operator_subtract", (ctx, block) => op_sub.create({
    left: ctx.readInput(block.inputs.NUM1),
    right: ctx.readInput(block.inputs.NUM2),
}));
