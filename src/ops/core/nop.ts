import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";

export const op_nop = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(): void { }
}
