import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export const ir_get_costume_number = new class extends CatnipIrInputOpType {
    public constructor() { super("looks_get_costume_number"); }

    public getOperandCount(): number {
        return 0;
    }

    public getResult(ir: CatnipIrOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_add);
    }
}
