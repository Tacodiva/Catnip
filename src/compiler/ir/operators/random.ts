import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_random = new class extends CatnipIrInputOpType {
    public constructor() { super("operators_random"); }

    public getOperandCount(): number {
        return 2;
    }

    public getResult(ir: CatnipReadonlyIrInputOp): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmGetRuntime();
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_operator_random");
    }
}

