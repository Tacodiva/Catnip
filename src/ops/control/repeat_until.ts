import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_branch } from "../../compiler/ir/core/branch";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_if_else } from "../../compiler/ir/control/if_else";
import { ir_not } from "../../compiler/ir/operators/not";

type repeat_until_inputs = { condition: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat_until = new class extends CatnipCommandOpType<repeat_until_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: repeat_until_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.condition;
        yield inputs.loop;
    }

    public isYielding(ir: CatnipIr): boolean {
        return ir.compiler.config.enable_warp_timer || !ir.isWarp;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_until_inputs): void {
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitInput(inputs.condition, CatnipValueFormat.I32_BOOLEAN);
                    ctx.emitIr(ir_not, {}, {});
                    
                    ctx.emitIr(ir_if_else, {}, {
                        true_branch: ctx.emitBranch(() => {
                            ctx.emitCommands(inputs.loop);
                            ctx.emitLoopYield();
                            ctx.emitJump(loopHead);
                        }),
                        false_branch: ctx.emitBranch()
                    });
                })
            }
        );
    }
}

registerSB3CommandBlock("control_repeat_until", (ctx, block) => op_repeat_until.create({
    condition: ctx.readInput(block.inputs.CONDITION),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
