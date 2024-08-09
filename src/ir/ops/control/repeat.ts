import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { ir_const } from "../core/const";
import { ir_if_else } from "./if_else";
import { CatnipInputFlags, CatnipInputFormat } from "../../types";
import { SpiderNumberType } from "wasm-spider";
import { ir_sub } from "../operators/sub";
import { ir_branch } from "../core/branch";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        ctx.emitInput(inputs.count, CatnipInputFormat.i32, CatnipInputFlags.NUMBER);
        const loopCount = ctx.emitStoreNewValue(SpiderNumberType.i32, "Loop Count");
        ctx.emitIrCommand(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitLoadValue(loopCount);
                    ctx.emitIrInput(ir_const, { value: 1 }, CatnipInputFormat.i32, CatnipInputFlags.ANY, {});
                    ctx.emitIrInput(ir_sub, { type: SpiderNumberType.i32 }, CatnipInputFormat.i32, CatnipInputFlags.ANY, {});
                    ctx.emitStoreValue(loopCount);

                    ctx.emitCommands(inputs.loop);

                    ctx.emitLoadValue(loopCount);
                    ctx.emitConditionalJump(loopHead);
                })
            }
        );
    }
}
