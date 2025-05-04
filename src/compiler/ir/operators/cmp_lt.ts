import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_cmp_lt = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_cmp_lt"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        // TODO optimize like cmp_gt
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_lt_s);
    }
}

