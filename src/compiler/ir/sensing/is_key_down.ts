import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { Cast } from "../../cast";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructIoKeys } from "../../../wasm-interop/CatnipWasmStructIoKeys";
import { CatnipCompilerKeyDownSubsystem } from "../../subsystems/CatnipCompilerKeyDownSubsystem";

export const ir_is_key_down = new class extends CatnipIrInputOpType {
    public constructor() { super("sensing_is_key_dowm"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipReadonlyIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {

        // Make sure the subsystem is in the compiler
        ctx.compiler.getSubsystem(CatnipCompilerKeyDownSubsystem);

        const keyInput = ir.operands[0];

        if (keyInput.isConstant) {

            let keyCode = Cast.toKeyCode(keyInput.constantValue);

            ctx.emitWasmGetRuntime();
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("io_keys"));
            ctx.emitWasm(SpiderOpcodes.i32_load8_u, 0, CatnipWasmStructIoKeys.getMemberOffset("keys") + keyCode);

            return;

        }

        throw new Error("Not supported :c");
    }
}
