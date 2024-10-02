import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";

export const op_yield = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public isYielding(): boolean {
        return true;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitYield();
    }
}
