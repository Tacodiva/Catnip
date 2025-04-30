import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipWasmStructHeapString } from "../../../wasm-interop/CatnipWasmStructHeapString";

export const ir_length = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_length"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipReadonlyIrOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant) {
            const value = ir.operands[0].asConstantString().length;
            return CatnipCompilerValue.constant(value, CatnipValueFormat.I32_NUMBER);
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_length");
    }
}

