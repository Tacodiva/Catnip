import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { Cast } from "../../cast";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructIO } from "../../../wasm-interop/CatnipWasmStructIO";
import { CatnipCompilerKeyDownSubsystem } from "../../subsystems/CatnipCompilerKeyDownSubsystem";

export const ir_is_key_down = new class extends CatnipIrInputOpType {
    public constructor() { super("sensing_is_key_dowm"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {

        // Make sure the subsystem is in the compiler
        ctx.compiler.getSubsystem(CatnipCompilerKeyDownSubsystem);

        const keyInput = ir.operands[0];

        if (keyInput.isConstant) {

            ctx.emitWasm(SpiderOpcodes.drop);

            let keyCode = Cast.toKeyCode(keyInput.constantValue);

            ctx.emitWasmGetRuntime();
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("io"));
            ctx.emitWasm(SpiderOpcodes.i32_load8_u, 0, CatnipWasmStructIO.getMemberOffset("keys") + keyCode);

            return;

        }

        ctx.emitWasmGetRuntime();
        ctx.emitWasmRuntimeFunctionCall("catnip_io_is_key_pressed");
    }
}
