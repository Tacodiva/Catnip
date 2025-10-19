import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { IR0CmdTransientSet } from "../../compiler/ir0/core/IR0CmdTransientSet";
import { IR0InputConst } from "../../compiler/ir0/core/IR0InputConst";
import { IR0InputTransientGet } from "../../compiler/ir0/core/IR0InputTransientGet";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputOperatorCmpGt } from "../../compiler/ir0/operators/IR0InputOperatorCmpGt";
import { IR0InputOperatorSub } from "../../compiler/ir0/operators/IR0InputOperatorSub";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {

    public *getInputsAndSubstacks(inputs: repeat_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.count;
        yield inputs.loop;
    }

    public generateIr(ctx: IR0Emitter, inputs: repeat_inputs): void {

        const loopCount = ctx.emitTransientCreate("lc", CatnipValueFormat.F64_NUMBER);

        ctx.emitCommand(new IR0CmdTransientSet(loopCount, ctx.emitInput(inputs.count)));

        ctx.emitInlineBlock(emitter => {
            const loopHead = emitter.block;

            // if (loopCount > 0)
            emitter.emitCondition(
                new IR0InputOperatorCmpGt(
                    new IR0InputTransientGet(loopCount),
                    new IR0InputConst(0)
                ),

                emitter => {
                    ctx.emitCommands(inputs.loop);

                    // loopCount = loopCount - 1
                    ctx.emitCommand(new IR0CmdTransientSet(loopCount, 
                        new IR0InputOperatorSub(
                            new IR0InputTransientGet(loopCount),
                            new IR0InputConst(1)
                        )
                    ));

                    ctx.emitFlow(loopHead);
                }
            );
        });
    }

    // public *getInputsAndSubstacks(ir: CatnipIr, inputs: repeat_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
    //     yield inputs.count;
    //     yield inputs.loop;
    // }

    // public isYielding(ir: CatnipIr): boolean {
    //     return ir.compiler.config.enable_warp_timer || !ir.isWarp;
    // }

    // public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
    //     const loopCount = ctx.emitTransientCreate(CatnipValueFormat.I32_NUMBER, "Loop Count");

    //     ctx.emitInput(inputs.count, CatnipValueFormat.I32_NUMBER);
    //     ctx.emitIr(ir_transient_tee, { transient: loopCount }, {});
    //     ctx.emitIrConst(0, CatnipValueFormat.I32_NUMBER);
    //     ctx.emitIr(ir_i32_cmp_gt, {}, {});

    //     ctx.emitIr(
    //         ir_if_else, {},
    //         {
    //             true_branch: ctx.emitBranch((loopHead) => {
    //                 ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
    //                 ctx.emitIrConst(1, CatnipValueFormat.I32_NUMBER);
    //                 ctx.emitIr(ir_i32_sub, {}, {});
    //                 ctx.emitIr(ir_transient_store, { transient: loopCount }, {});

    //                 ctx.emitCommands(inputs.loop);
    //                 ctx.emitLoopYield();

    //                 ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
    //                 ctx.emitConditionalJump(loopHead);
    //             }),
    //             false_branch: ctx.emitBranch(),
    //         }
    //     )
    // }
}

registerSB3CommandBlock("control_repeat", (ctx, block) => op_repeat.create({
    count: ctx.readInput(block.inputs.TIMES),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
