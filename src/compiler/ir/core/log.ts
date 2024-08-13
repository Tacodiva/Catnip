
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export const ir_log = new class extends CatnipIrCommandOpType {
    public constructor() { super("core_log"); }
    
    public getOperandCount(): number { return 1; }
    
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_debug_log");
    }
}