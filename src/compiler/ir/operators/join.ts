import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_join = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_join"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
            const value = ir.operands[0].asConstantString() + ir.operands[1].asConstantString();
            return CatnipCompilerValue.constant(value, CatnipValueFormat.I32_HSTRING);
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmGetRuntime();
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_join");
    }
}

