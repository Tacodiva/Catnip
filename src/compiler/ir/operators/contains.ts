import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_contains = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_contains"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        // if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
        //     return CatnipCompilerValue.constant(
        //         ir.operands[0].asConstantString().toLowerCase().indexOf(ir.operands[1].asConstantString().toLowerCase()) !== -1,
        //         CatnipValueFormat.I32_BOOLEAN);
        // }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_contains");
    }
}

