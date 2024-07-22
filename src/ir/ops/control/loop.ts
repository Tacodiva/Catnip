import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";

type loop_branches = { loop: CatnipIrBranch }

export const ir_loop = new class extends CatnipIrCommandOpType<{}, loop_branches> {
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, loop_branches>): void {
        ctx.pushExpression();
        
        ctx.emitBranchInline(ir.branches.loop);

        const loopExpression = ctx.popExpression();

        ctx.emitWasm(SpiderOpcodes.loop, loopExpression);
        // ctx.emitWasm(SpiderOpcodes.if, ctx.emitBranch(ir.branches.true_branch), ctx.emitBranch(ir.branches.false_branch));
    }
}