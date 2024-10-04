import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerLogger } from "../../compiler/CatnipCompilerLogger";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_if_else } from "../../compiler/ir/control/if_else";
import { ir_branch } from "../../compiler/ir/core/branch";
import { ir_const } from "../../compiler/ir/core/const";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_transient_tee } from "../../compiler/ir/core/transient_tee";
import { ir_wait_for_threads } from "../../compiler/ir/core/wait_for_threads";
import { ir_broadcast } from "../../compiler/ir/event/broadcast";
import { ir_i32_cmp_eq } from "../../compiler/ir/operators/i32_cmp_eq";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type broadcast_and_wait_inputs = { broadcastName: CatnipInputOp };

export const op_event_broadcast_and_wait = new class extends CatnipCommandOpType<broadcast_and_wait_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: broadcast_and_wait_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.broadcastName;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: broadcast_and_wait_inputs) {
        ctx.emitInput(inputs.broadcastName, CatnipValueFormat.I32_HSTRING);

        const threadListVariable = ctx.emitTransientCreate(CatnipValueFormat.I32, "Thread List");

        ctx.emitIr(ir_broadcast, { threadListVariable: threadListVariable }, {});
        ctx.emitIr(
            ir_branch, {},
            {
                branch: ctx.emitBranch((loopHead) => {

                    const threadStatusVariable = ctx.emitTransientCreate(CatnipValueFormat.I32, "Thread Status");

                    ctx.emitIr(ir_transient_load, { transient: threadListVariable }, {});
                    ctx.emitIr(ir_wait_for_threads, {}, {});
                    ctx.emitIr(ir_transient_tee, { transient: threadStatusVariable }, {});

                    CatnipCompilerLogger.assert(CatnipWasmEnumThreadStatus.RUNNING === 0);

                    ctx.emitIr(ir_if_else, {}, {
                        true_branch: ctx.emitBranch(() => {
                            ctx.emitIr(ir_transient_load, { transient: threadStatusVariable }, {});
                            ctx.emitIr<typeof ir_const>(ir_const, { value: CatnipWasmEnumThreadStatus.YIELD, format: CatnipValueFormat.I32_NUMBER }, {});
                            ctx.emitIr(ir_i32_cmp_eq, {}, {});
                            
                            ctx.emitIr(ir_if_else, {}, {
                                true_branch: ctx.emitBranch(() => ctx.emitJump(loopHead, CatnipWasmEnumThreadStatus.YIELD)),
                                false_branch: ctx.emitBranch(() => ctx.emitJump(loopHead, CatnipWasmEnumThreadStatus.YILED_TICK))
                            });
                            
                        }),
                        false_branch: ctx.emitBranch(),
                    });
                })
            }
        )
    }
}

registerSB3CommandBlock("event_broadcastandwait", (ctx, block) => op_event_broadcast_and_wait.create({
    broadcastName: ctx.readInput(block.inputs.BROADCAST_INPUT)
}));