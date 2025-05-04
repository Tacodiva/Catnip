
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export const ir_pen_change_size = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("pen_change_size"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, {}>): void {
        const local = ctx.createLocal(SpiderNumberType.f64);
        ctx.emitWasm(SpiderOpcodes.local_set, local.ref);
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasm(SpiderOpcodes.f32_load, 2, CatnipWasmStructTarget.getMemberOffset("pen_thickness"));
        ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
        ctx.emitWasm(SpiderOpcodes.f32_demote_f64);
        ctx.emitWasm(SpiderOpcodes.f32_add);
        ctx.emitWasm(SpiderOpcodes.f32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_thickness"));
        ctx.releaseLocal(local);
    }
}