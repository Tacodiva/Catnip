import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_if_else } from "../../compiler/ir/control/if_else";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";

type if_else_inputs = { condition: CatnipInputOp, true_branch: CatnipCommandList, false_branch?: CatnipCommandList };

export const op_if_else = new class extends CatnipCommandOpType<if_else_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: if_else_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.condition;
        yield inputs.true_branch;
        if (inputs.false_branch)
            yield inputs.false_branch;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: if_else_inputs): void {
        ctx.emitInput(inputs.condition, CatnipValueFormat.I32_NUMBER);
        ctx.emitIr(
            ir_if_else, {},
            {
                true_branch: ctx.emitBranch(inputs.true_branch),
                false_branch: ctx.emitBranch(inputs.false_branch ? inputs.false_branch : null)
            }
        );
    }
}

registerSB3CommandBlock("control_if", (ctx, block) => op_if_else.create({
    condition: ctx.readInput(block.inputs.CONDITION),
    true_branch: ctx.readStack(block.inputs.SUBSTACK),
}));

registerSB3CommandBlock("control_if_else", (ctx, block) => op_if_else.create({
    condition: ctx.readInput(block.inputs.CONDITION),
    true_branch: ctx.readStack(block.inputs.SUBSTACK),
    false_branch: ctx.readStack(block.inputs.SUBSTACK2),
}));