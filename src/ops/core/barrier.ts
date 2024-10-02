import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { ir_barrier } from "../../compiler/ir/core/barrier";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";

export const op_barrier = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_barrier, {}, {});
    }
}