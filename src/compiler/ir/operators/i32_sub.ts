import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_i32_sub = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_i32_sub"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        return { isConstant: false, format: CatnipValueFormat.I32_NUMBER };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasm(SpiderOpcodes.i32_sub);
    }
}

