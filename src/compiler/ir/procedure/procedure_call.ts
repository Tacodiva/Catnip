import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";

export type ir_procedure_call_inputs = { }
export type ir_procedure_call_branches = { branch: CatnipIrBranch }

export const ir_branch = new class extends CatnipIrCommandOpType<ir_procedure_call_inputs, ir_procedure_call_branches> {
    public constructor() { super("core_procedure_call"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_procedure_call_inputs, ir_procedure_call_branches>): void {
        ctx.emitBranchInline(ir.branches.branch);
    }

    public doesContinue(ir: CatnipReadonlyIrOp<{}, ir_procedure_call_branches, CatnipIrOpType<ir_procedure_call_inputs, ir_procedure_call_branches>>): boolean {
        return !(ir.branches.branch.isFuncBody && ir.branches.branch.isYielding());
    }
}