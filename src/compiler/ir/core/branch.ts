import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch, CatnipIrBranchType } from "../../CatnipIrBranch";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";

export type ir_branch_branches = { branch: CatnipIrBranch };

export const ir_branch = new class extends CatnipIrCommandOpType<{}, ir_branch_branches> {
    public constructor() { super("core_branch"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, ir_branch_branches>): void {
        ctx.emitBranchInline(ir.branches.branch);
    }

    public doesContinue(ir: CatnipReadonlyIrOp<{}, ir_branch_branches, CatnipIrOpType<{}, ir_branch_branches>>): boolean {
        return !(ir.branches.branch.body.isFuncBody && ir.branches.branch.isYielding);
    }
}