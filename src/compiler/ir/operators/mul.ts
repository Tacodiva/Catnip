import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_mul = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_mul"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
            const value = ir.operands[0].asConstantNumber() * ir.operands[1].asConstantNumber();
            return CatnipCompilerValue.constant(value, CatnipValueFormatUtils.getNumberFormat(value));
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.f64_mul);
    }
}

