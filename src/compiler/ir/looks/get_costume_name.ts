import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructCostume } from "../../../wasm-interop/CatnipWasmStructCostume";

export const ir_get_costume_name = new class extends CatnipIrInputOpType {
    public constructor() { super("looks_get_costume_name"); }

    public getOperandCount(): number {
        return 0;
    }

    public getResult(ir: CatnipIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        // Get the offset of the costume in the costumes array
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
        ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmStructCostume.size);
        ctx.emitWasm(SpiderOpcodes.i32_mul);

        // We have the costume offset, now we need to get the costumes array

        // The costumes array pointer is a constant
        ctx.emitWasmConst(SpiderNumberType.i32, ctx.sprite.structWrapper.getMember("costumes"));
        ctx.emitWasm(SpiderOpcodes.i32_add);

        // Okay we've got the pointer to the costume, load the name!
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructCostume.getMemberOffset("name"));
    }
}
