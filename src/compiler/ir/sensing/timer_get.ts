import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";

export const ir_timer_get = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("sensing_timer_get"); }

    public getOperandCount(): number {
        return 0;
    }

    public getResult(ir: CatnipIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasmGetRuntime();
        ctx.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("time"));

        ctx.emitWasmGetRuntime();
        ctx.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("timer_start"));

        // time - timer_start
        ctx.emitWasm(SpiderOpcodes.i64_sub);

        // Convert to seconds by diving by 1000
        ctx.emitWasm(SpiderOpcodes.f64_convert_i64_u);
        ctx.emitWasmConst(SpiderNumberType.f64, 1000);
        ctx.emitWasm(SpiderOpcodes.f64_div);
    }
}
