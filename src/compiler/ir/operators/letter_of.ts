import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";

export const ir_letter_of = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_letter_or"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipReadonlyIrOp): CatnipCompilerValue {
        // TODO
        // if (ir.operands[0].isConstant && ir.operands[1].isConstant) {
        //     const value = ir.operands[0].asConstantString().length;
        //     return CatnipCompilerValue.constant(value, CatnipValueFormat.I32_NUMBER);
        // }

        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmConst(SpiderNumberType.i32, 1);
        ctx.emitWasm(SpiderOpcodes.i32_sub);
        ctx.emitWasmGetRuntime();
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_char_at");
    }
}

