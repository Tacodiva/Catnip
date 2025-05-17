import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrInputOp } from "../../CatnipIrOp";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";

export const ir_timer_reset = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("sensing_timer_reset"); }

    public getOperandCount(): number {
        return 0;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        // runtime->timer_start = runtime->time
        ctx.emitWasmGetRuntime();
        ctx.emitWasmGetRuntime();
        ctx.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("time"));
        ctx.emitWasm(SpiderOpcodes.i64_store, 3, CatnipWasmStructRuntime.getMemberOffset("timer_start"));
    }
}
