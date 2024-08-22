import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_branch } from "../../compiler/ir/core/branch";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_transient_store } from "../../compiler/ir/core/transient_store";
import { ir_sub } from "../../compiler/ir/operators/sub";
import { CatnipValueFlags, CatnipValueFormat } from "../../compiler/types";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        const loopCount = ctx.emitTransientCreate(CatnipValueFormat.i32, "Loop Count");
        ctx.emitInput(inputs.count, CatnipValueFormat.i32, CatnipValueFlags.NUMBER);
        ctx.emitIr(ir_transient_store, { transient: loopCount }, {});
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitIr(ir_const, { value: "1", format: CatnipValueFormat.i32, flags: CatnipValueFlags.ANY }, {});
                    ctx.emitIr(ir_sub, { type: SpiderNumberType.i32 }, {});
                    ctx.emitIr(ir_transient_store, { transient: loopCount }, {});

                    ctx.emitCommands(inputs.loop);

                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitConditionalJump(loopHead);
                })
            }
        );
    }
}
