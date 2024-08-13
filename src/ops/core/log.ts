import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_log } from "../../compiler/ir/core/log";
import { CatnipValueFlags, CatnipValueFormat } from "../../compiler/types";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

export const op_log = new class extends CatnipCommandOpType<{ msg: CatnipInputOp }> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: { msg: CatnipInputOp; }): void {
        ctx.emitInput(inputs.msg, CatnipValueFormat.HSTRING_PTR, CatnipValueFlags.ANY);
        ctx.emitIr(ir_log, {}, {});
    }
}
