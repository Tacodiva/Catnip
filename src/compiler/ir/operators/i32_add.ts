import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_i32_add = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_i32_add"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasm(SpiderOpcodes.i32_add);
    }
}

