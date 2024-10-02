import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { ir_thread_terminate } from "../../compiler/ir/core/thread_terminate";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";

export const op_thread_terminate = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_thread_terminate, {}, {});
    }
}