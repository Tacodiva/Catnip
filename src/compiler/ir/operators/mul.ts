import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export const ir_mul = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_mul"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        if (operands[0].isConstant && operands[1].isConstant) {
            const value = Cast.toNumber(operands[0].value) * Cast.toNumber(operands[1].value);
            return { isConstant: true, value, format: CatnipValueFormatUtils.getNumberFormat(value) }
        }

        return { isConstant: false, format: CatnipValueFormat.F64_NUMBER_OR_NAN };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.f64_mul);
    }
}
