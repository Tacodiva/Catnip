import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipIrBranchType } from "../CatnipIrBranch";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreLoopPassAnalyzeFunctionCallers: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {
        ir.forEachOp(op => {
            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];

                if (subbranch.branchType === CatnipIrBranchType.INTERNAL && op.block.func !== subbranch.body.func) {
                    subbranch.body.func.registerCaller(op.block.func);
                }
            }
        });
    }
}
