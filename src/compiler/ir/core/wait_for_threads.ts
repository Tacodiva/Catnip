import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export const ir_wait_for_threads = new class extends CatnipIrInputOpType<{}> {
    public constructor() { super("core_wait_for_threads"); }

    public getOperandCount(): number { return 1; }

    public getResult(): CatnipCompilerValue {
        return { format: CatnipValueFormat.I32_NUMBER, isConstant: false };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_wait_for_threads");
    }
}