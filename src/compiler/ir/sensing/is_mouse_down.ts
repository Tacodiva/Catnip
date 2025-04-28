import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructIO } from "../../../wasm-interop/CatnipWasmStructIO";
import { CatnipCompilerMouseSubsystem } from "../../subsystems/CatnipCompilerMouseSubsystem";

export const ir_is_mouse_down = new class extends CatnipIrInputOpType {
    public constructor() { super("sensing_is_mouse_dowm"); }

    public getOperandCount(): number {
        return 0;
    }

    public getResult(ir: CatnipReadonlyIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {

        // Make sure the subsystem is in the compiler
        ctx.compiler.getSubsystem(CatnipCompilerMouseSubsystem);

        ctx.emitWasmGetRuntime();
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("io"));
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructIO.getMemberOffset("mouse_down"));
    }
}
