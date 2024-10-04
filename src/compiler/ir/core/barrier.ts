import { CatnipIrCommandOpType, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";

export const ir_barrier = new class extends CatnipIrCommandOpType<{}> {
    public constructor() { super("core_barrier"); }

    public getOperandCount(): number { return 0; }

    public isBarrier() { return true; }

    public generateWasm(): void {}
}