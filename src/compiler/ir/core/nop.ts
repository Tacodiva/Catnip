import { CatnipIrCommandOpType } from "../../CatnipIrOp";

export const ir_nop = new class extends CatnipIrCommandOpType {
    constructor() { super("core_nop"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(): void { }
}