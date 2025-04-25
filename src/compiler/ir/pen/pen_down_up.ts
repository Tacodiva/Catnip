
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export type pen_down_up_ir_inputs = { type: "down" | "up" };

export const ir_pen_down_up = new class extends CatnipIrCommandOpType<pen_down_up_ir_inputs> {
    public constructor() { super("pen_down_up"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<pen_down_up_ir_inputs, {}>): void {
        ctx.emitWasmGetCurrentTarget();

        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_pen_down");

        // if (ir.inputs.type === "up") {
        //     ctx.emitWasmConst(SpiderNumberType.i32, 0);
        // } else {
        //     ctx.emitWasmConst(SpiderNumberType.i32, 1);
        // }

        // ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_down"));
    }
}