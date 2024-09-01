import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreLoopPassAnalyzeFunctionCallers: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {
        ir.forEachOp(op => {
            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];

                if (op.branch.func !== subbranch.func) {
                    subbranch.func.registerCaller(op.branch.func);
                }
            }
        });
    }
}
