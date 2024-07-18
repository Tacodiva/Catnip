
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { CatnipInputFlags, CatnipInputFormat } from "../../types";

export const op_log = new class extends CatnipCommandOpType<{ msg: CatnipInputOp }> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { msg: CatnipInputOp; }): void {
        ctx.emitInput(inputs.msg, CatnipInputFormat.HSTRING_PTR, CatnipInputFlags.ANY);
        ctx.emitIrCommand(ir_log, {}, {});
    }
}

export const ir_log = new class extends CatnipIrCommandOpType {
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_debug_log");
    }
}