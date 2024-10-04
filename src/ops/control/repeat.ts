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

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: repeat_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.count;
        yield inputs.loop;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        const loopCount = ctx.emitTransientCreate(CatnipValueFormat.I32_NUMBER, "Loop Count");
        ctx.emitInput(inputs.count, CatnipValueFormat.I32_NUMBER);
        ctx.emitIr(ir_transient_store, { transient: loopCount }, {});
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitIr<typeof ir_const>(ir_const, { value: 1, format: CatnipValueFormat.I32_NUMBER }, {});
                    ctx.emitIr(ir_i32_sub, { }, {});
                    ctx.emitIr(ir_transient_store, { transient: loopCount }, {});

                    ctx.emitCommands(inputs.loop);

                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitConditionalJump(loopHead);
                })
            }
        );
    }
}

registerSB3CommandBlock("control_repeat", (ctx, block) => op_repeat.create({
    count: ctx.readInput(block.inputs.TIMES),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
