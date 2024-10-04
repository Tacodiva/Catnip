import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";

export const ir_or = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_or"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        if (operands[0].isConstant && operands[1].isConstant) {
            const value = Cast.toBoolean(operands[0].value) || Cast.toBoolean(operands[1].value);
            return { isConstant: true, value: ""+value, format: CatnipValueFormat.I32_BOOLEAN }
        }

        return { isConstant: false, format: CatnipValueFormat.I32_BOOLEAN };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.i32_or);
    }
}

