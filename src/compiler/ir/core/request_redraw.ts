import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";

export const ir_request_redraw = new class extends CatnipIrCommandOpType<{}> {
    constructor() { super("core_request_redraw"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext): void {
        // Set redraw requested to 1.
        ctx.emitWasmGetRuntime();
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructRuntime.getMemberOffset("redraw_requested"));
    }
}