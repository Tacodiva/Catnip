import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructIO } from "../../../wasm-interop/CatnipWasmStructIO";
import { CatnipCompilerMouseSubsystem } from "../../subsystems/CatnipCompilerMouseSubsystem";

type get_mouse_pos_ir_inputs = { axis: "x" | "y" };

export const ir_get_mouse_pos = new class extends CatnipIrInputOpType<get_mouse_pos_ir_inputs> {
    public constructor() { super("sensing_get_mouse_pos"); }

    public getOperandCount(): number {
        return 0;
    }

    public getResult(ir: CatnipIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_mouse_pos_ir_inputs>): void {
        // Ensure subsystem is in
        ctx.compiler.getSubsystem(CatnipCompilerMouseSubsystem)
        ctx.emitWasmGetRuntime();
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("io"));
        ctx.emitWasm(SpiderOpcodes.f64_load, 3, CatnipWasmStructIO.getMemberOffset(ir.inputs.axis === "x" ? "mouse_x" : "mouse_y"));
    }
}
