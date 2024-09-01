import { CatnipIrCommandOpType } from "../../CatnipIrOp";

export const ir_barrier = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("core_barrier"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(): void {}
}