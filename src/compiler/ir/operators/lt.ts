import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";

// TODO Very temporary implementation, This needs to support strings as well
export const ir_lt = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("operators_lt"); }

    public getOperandCount(inputs: {}, branches: {}): number {
        return 2;
    }

    public getResult(inputs: {}, branches: {}, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        return { isConstant: false, format: CatnipValueFormat.I32_BOOLEAN };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<{}>): void {
        ctx.emitWasm(SpiderOpcodes.f64_lt);
    }
}

