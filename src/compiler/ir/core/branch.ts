import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export type ir_branch_branches = { branch: CatnipIrBranch }

export const ir_branch = new class extends CatnipIrCommandOpType<{}, ir_branch_branches> {
    public constructor() { super("core_branch"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, ir_branch_branches>): void {
        ctx.emitBranchInline(ir.branches.branch);
    }
}