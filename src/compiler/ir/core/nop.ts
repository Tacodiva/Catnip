import { CatnipIrCommandOpType } from "../../CatnipIrOp";

export type ir_nop_inputs = { comment?: string }

export const ir_nop = new class extends CatnipIrCommandOpType<ir_nop_inputs> {
    constructor() { super("core_nop"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(): void { }

    public stringifyInputs(inputs: ir_nop_inputs): string {
        return `'${inputs.comment}'` ?? "";
    }
}