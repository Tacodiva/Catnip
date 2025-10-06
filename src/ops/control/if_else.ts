import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type if_else_inputs = { condition: CatnipInputOp, true_branch: CatnipCommandList, false_branch?: CatnipCommandList };

export const op_if_else = new class extends CatnipCommandOpType<if_else_inputs> {
    public generateIr(ctx: IR0Emitter, inputs: if_else_inputs): void {

        ctx.emitCondition(
            ctx.emitInput(inputs.condition),
            (ctx) => {
                ctx.emitCommands(inputs.true_branch)
            },
            (ctx) => {
                if (inputs.false_branch) {
                    ctx.emitCommands(inputs.false_branch)
                }
            }
        )
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

