import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_cmp_eq = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_cmp_eq"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        return { isConstant: false, format: CatnipValueFormat.I32_BOOLEAN };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_eq");
    }
}
