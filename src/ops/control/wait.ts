
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_time_get } from "../../compiler/ir/sensing/time_get";
import { ir_mul } from "../../compiler/ir/operators/mul";
import { ir_add } from "../../compiler/ir/operators/add";
import { ir_transient_store } from "../../compiler/ir/core/transient_store";
import { ir_yield } from "../../compiler/ir/core/yield";
import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { ir_branch } from "../../compiler/ir/core/branch";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_cmp_lt } from "../../compiler/ir/operators/cmp_lt";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";

type wait_inputs = { time: CatnipInputOp };

export const op_wait = new class extends CatnipCommandOpType<wait_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: wait_inputs): IterableIterator<CatnipOp> {
        yield inputs.time;
    }

    public isYielding(ir: CatnipIr, inputs: wait_inputs): boolean {
        return true;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: wait_inputs): void {
        // Convert time to miliseconds
        ctx.emitInput(inputs.time);
        ctx.emitIrConst(1000, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_mul, {}, {});

        // Add it to the current time
        ctx.emitIr(ir_time_get, {}, {});
        ctx.emitIr(ir_add, {}, {});

        // Remember this value
        const timeValue = ctx.emitTransientCreate(CatnipValueFormat.F64_NUMBER, "wait_timer");
        ctx.emitIr(ir_transient_store, { transient: timeValue }, {});

        const loopBranch = ctx.emitBranch((block) => {
            // Get the current time
            ctx.emitIr(ir_time_get, {}, {});

            // Get the time we're waiting for
            ctx.emitIr(ir_transient_load, { transient: timeValue }, {});

            // Go back to the head of the loop if it's not time yet
            ctx.emitIr(ir_cmp_lt, {}, {});
            ctx.emitConditionalJump(block, CatnipWasmEnumThreadStatus.YIELD);
        });

        ctx.emitIr(ir_request_redraw, {}, {});
        ctx.emitIr(ir_yield, { status: CatnipWasmEnumThreadStatus.YIELD }, { branch: loopBranch });
    }
}

registerSB3CommandBlock("control_wait", (ctx, block) =>
    op_wait.create({
        time: ctx.readInput(block.inputs.DURATION),
    })
);
