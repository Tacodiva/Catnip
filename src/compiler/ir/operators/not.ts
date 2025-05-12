import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { Cast } from "../../cast";

export const ir_not = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_not"); }

    public getOperandCount(): number {
        return 1;
    }

    public getResult(ir: CatnipIrInputOp): CatnipCompilerValue {
        if (ir.operands[0].isConstant) {
            const value = !ir.operands[0].asConstantBoolean();
            return CatnipCompilerValue.constant(value, CatnipValueFormat.I32_BOOLEAN);
        }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.i32_eqz);
    }
}

