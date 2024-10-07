import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_branch } from "../../compiler/ir/core/branch";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_transient_store } from "../../compiler/ir/core/transient_store";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_i32_sub } from "../../compiler/ir/operators/i32_sub";
import { ir_transient_tee } from "../../compiler/ir/core/transient_tee";
import { ir_log } from "../../compiler/ir/core/log";
import { ir_i32_cmp_gt } from "../../compiler/ir/operators/i32_cmp_gt";
import { ir_if_else } from "../../compiler/ir/control/if_else";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: repeat_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.count;
        yield inputs.loop;
    }

    public isYielding(ir: CatnipIr): boolean {
        return ir.compiler.config.enable_warp_timer || !ir.isWarp;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        const loopCount = ctx.emitTransientCreate(CatnipValueFormat.I32_NUMBER, "Loop Count");

        ctx.emitInput(inputs.count, CatnipValueFormat.I32_NUMBER);
        ctx.emitIr(ir_transient_tee, { transient: loopCount }, {});
        ctx.emitIr<typeof ir_const>(ir_const, { value: 0, format: CatnipValueFormat.I32_NUMBER }, {});
        ctx.emitIr(ir_i32_cmp_gt, {}, {});

        ctx.emitIr(
            ir_if_else, {},
            {
                true_branch: ctx.emitBranch((loopHead) => {
                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitIr<typeof ir_const>(ir_const, { value: 1, format: CatnipValueFormat.I32_NUMBER }, {});
                    ctx.emitIr(ir_i32_sub, {}, {});
                    ctx.emitIr(ir_transient_store, { transient: loopCount }, {});

                    ctx.emitCommands(inputs.loop);
                    ctx.emitLoopYield();

                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitConditionalJump(loopHead);
                }),
                false_branch: ctx.emitBranch(),
            }
        )
    }
}

registerSB3CommandBlock("control_repeat", (ctx, block) => op_repeat.create({
    count: ctx.readInput(block.inputs.TIMES),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
