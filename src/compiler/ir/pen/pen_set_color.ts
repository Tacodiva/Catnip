
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export const ir_pen_set_color = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("pen_set_color"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, {}>): void {

        const local = ctx.createLocal(SpiderNumberType.i32);

        // Set ARGB
        ctx.emitWasm(SpiderOpcodes.local_set, local.ref);
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb"));

        ctx.releaseLocal(local);

        // Mark THSV as invalid
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_thsv_valid"));

        // Mark RGB as valid
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb_valid"));

    }
}