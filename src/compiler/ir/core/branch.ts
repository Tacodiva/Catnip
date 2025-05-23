import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType } from "../../CatnipIrOp";

export type ir_branch_branches = { branch: CatnipIrBranch };

export const ir_branch = new class extends CatnipIrCommandOpType<{}, ir_branch_branches> {
    public constructor() { super("core_branch"); }

    public getOperandCount(inputs: {}, branches: ir_branch_branches): number {
        return branches.branch.parameters.length;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, ir_branch_branches>): void {
        ctx.emitBranchInline(ir.branches.branch);
    }

    public doesContinue(ir: CatnipIrOp<{}, ir_branch_branches, CatnipIrOpType<{}, ir_branch_branches>>): boolean {
        return !(ir.branches.branch.body.isFuncBody && ir.branches.branch.isYielding(new Set()));
    }
}