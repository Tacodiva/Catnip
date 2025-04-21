
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export type set_xy_ir_inputs = { };

export const ir_set_xy = new class extends CatnipIrCommandOpType<set_xy_ir_inputs> {
    public constructor() { super("motion_set_xy"); }

    public getOperandCount(): number { return 2; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<set_xy_ir_inputs, {}>): void {
        
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasmRuntimeFunctionCall("catnip_target_set_xy");

    }
}