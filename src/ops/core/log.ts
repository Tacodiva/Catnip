import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_log } from "../../compiler/ir/core/log";
import { CatnipValueFormat } from "../../compiler/types";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

export const op_log = new class extends CatnipCommandOpType<{ msg: CatnipInputOp }> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { msg: CatnipInputOp; }): void {
        ctx.emitInput(inputs.msg, CatnipValueFormat.I32_HSTRING);
        ctx.emitIr(ir_log, {}, {});
    }
}
