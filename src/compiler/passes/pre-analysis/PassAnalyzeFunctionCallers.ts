import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipCompilerPassContext } from "../../CatnipCompilerPassContext";
import { CatnipCompilerStage } from "../../CatnipCompilerStage";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrBranchType } from "../../CatnipIrBranch";
import { CatnipCompilerPass } from "../CatnipCompilerPass";

export const PassAnalyzeFunctionCallers: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_ANALYSIS,

    run(ctx: CatnipCompilerPassContext): void {
        ctx.forEachOp(op => {
            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];

                if (subbranch.branchType === CatnipIrBranchType.INTERNAL) {
                    if (op.block.func !== subbranch.body.func) {
                        subbranch.body.func.registerCaller(op.block.func);
                    }
                } else {
                    CatnipCompilerLogger.assert(subbranch.branchType === CatnipIrBranchType.EXTERNAL);
                    if (subbranch.returnLocation !== null) {
                        subbranch.returnLocation.body.func.registerCaller(op.block.func);
                    }
                }
            }
        });
    }
}
