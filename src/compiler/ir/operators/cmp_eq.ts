import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_cmp_eq = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_cmp_eq"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_eq");
    }
}

