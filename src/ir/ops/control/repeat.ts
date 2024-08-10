import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { ir_const } from "../core/const";
import { ir_if_else } from "./if_else";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";
import { SpiderNumberType } from "wasm-spider";
import { ir_sub } from "../operators/sub";
import { ir_branch } from "../core/branch";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        ctx.emitInput(inputs.count, CatnipValueFormat.i32, CatnipValueFlags.NUMBER);
        const loopCount = ctx.emitStoreNewVariable(CatnipValueFormat.i32, "Loop Count");
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {
                    ctx.emitLoadVariable(loopCount);
                    ctx.emitIr(ir_const, { value: "1", format: CatnipValueFormat.i32, flags: CatnipValueFlags.ANY }, {});
                    ctx.emitIr(ir_sub, { type: SpiderNumberType.i32 }, {});
                    ctx.emitStoreVariable(loopCount);

                    ctx.emitCommands(inputs.loop);

                    ctx.emitLoadVariable(loopCount);
                    ctx.emitConditionalJump(loopHead);
                })
            }
        );
    }
}
