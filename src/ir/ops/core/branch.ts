import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";

export const ir_branch = new class extends CatnipIrCommandOpType<{}, {branch: CatnipIrBranch}> {
    public constructor() { super("core_branch"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, {branch: CatnipIrBranch}>): void {
        ctx.emitBranchInline(ir.branches.branch);
    }
}