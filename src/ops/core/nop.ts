import { CatnipCommandOpType } from "../CatnipOp";

export const op_nop = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks() { }
    public generateIr(): void { }
}
