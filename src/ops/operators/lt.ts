import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { ir_lt } from "../../compiler/ir/operators/lt";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";

export type lt_inputs = { left: CatnipInputOp, right: CatnipInputOp };

export const op_lt = new class extends CatnipInputOpType<lt_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: lt_inputs): IterableIterator<CatnipOp> {
        yield inputs.left;
        yield inputs.right;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: lt_inputs) {
        ctx.emitInput(inputs.left, CatnipValueFormat.F64_NUMBER);
        ctx.emitInput(inputs.right, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_lt, {}, {});
    }
}

registerSB3InputBlock("operator_lt", (ctx, block) => op_lt.create({
    left: ctx.readInput(block.inputs.OPERAND1),
    right: ctx.readInput(block.inputs.OPERAND2),
}));
