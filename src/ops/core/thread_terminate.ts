import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_thread_terminate } from "../../compiler/ir/core/thread_terminate";
import { CatnipCommandOpType } from "../CatnipOp";

export const op_thread_terminate = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_thread_terminate, {}, {});
    }
}