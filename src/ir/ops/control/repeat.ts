import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { ir_const } from "../core/const";
import { ir_if_else } from "./if_else";
import { CatnipInputFlags, CatnipInputFormat } from "../../types";
import { SpiderNumberType } from "wasm-spider";
import { ir_sub } from "../operators/sub";

type repeat_inputs = { count: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat = new class extends CatnipCommandOpType<repeat_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: repeat_inputs): void {
        ctx.emitInput(inputs.count, CatnipInputFormat.i32, CatnipInputFlags.NUMBER);
        const loopCount = ctx.emitStoreNewValue(SpiderNumberType.i32, "Loop Count");
        ctx.emitIrCommand(
            ir_repeat, {},
            {
                loop: ctx.emitBranch((loopHead) => {
                    ctx.emitLoadValue(loopCount);
                    ctx.emitIrInput(ir_const, { value: 1 }, CatnipInputFormat.i32, CatnipInputFlags.ANY, {});
                    ctx.emitIrInput(ir_sub, { type: SpiderNumberType.i32 }, CatnipInputFormat.i32, CatnipInputFlags.ANY, {});
                    ctx.emitStoreValue(loopCount);

                    ctx.emitCommands(inputs.loop);

                    ctx.emitLoadValue(loopCount);
                    ctx.emitIrCommand(ir_if_else, {}, {
                        true_branch: ctx.emitBranch(() => {
                            ctx.emitJump(loopHead);
                        }),
                        false_branch: null
                    })
                })
            }
        );
    }
}

type repeat_ir_branches = { loop: CatnipIrBranch }

export const ir_repeat = new class extends CatnipIrCommandOpType<{}, repeat_ir_branches> {

    public constructor() { super("control_repeat"); }
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, repeat_ir_branches>): void {
        ctx.emitBranchInline(ir.branches.loop);
    }

    public doesBranchContinue(branch: "loop", ir: CatnipIrOpBase<{}, repeat_ir_branches>): boolean {
        return true;
    }
}