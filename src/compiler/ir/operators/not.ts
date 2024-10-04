import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";

export const ir_not = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_not"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        if (operands[0].isConstant) {
            const value = !Cast.toBoolean(operands[0].value);
            return { isConstant: true, value: ""+value, format: CatnipValueFormat.I32_BOOLEAN }
        }

        return { isConstant: false, format: CatnipValueFormat.I32_BOOLEAN };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.i32_eqz);
    }
}

