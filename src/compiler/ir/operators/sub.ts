import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_sub = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_sub"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
            const value = ir.operands[0].asConstantNumber() - ir.operands[1].asConstantNumber();
            return CatnipCompilerValue.constant(value, CatnipValueFormatUtils.getNumberFormat(value));
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.f64_sub);
    }
}

