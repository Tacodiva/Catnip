import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_if_else } from "../../compiler/ir/control/if_else";
import { CatnipValueFormat } from "../../compiler/types";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type if_else_inputs = { condition: CatnipInputOp, true_branch: CatnipCommandList, false_branch?: CatnipCommandList };

export const op_if_else = new class extends CatnipCommandOpType<if_else_inputs> {
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