import { CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType } from "../../CatnipOp";

export const op_nop = new class extends CatnipCommandOpType<{}> {
    public generateIr(): void { }
}

export const ir_nop = new class extends CatnipIrCommandOpType {
    public generateWasm(): void { }
}