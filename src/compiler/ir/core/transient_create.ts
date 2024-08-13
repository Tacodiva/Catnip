
import { CatnipIrTransientVariable } from "../../../compiler/CatnipIrTransientVariable";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export type ir_transient_create = { variable: CatnipIrTransientVariable };

export const ir_transient_create = new class extends CatnipIrCommandOpType<ir_transient_create> {
    public constructor() { super("core_transient_create"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(): void { }

    public analyzePreEmit(ir: CatnipIrOp<ir_transient_create>, branch: CatnipIrBranch): void {
        branch.func.createTransientVariable(ir.inputs.variable);
    }
}