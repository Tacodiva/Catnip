import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { ir_transient_create } from "../ir/core/transient_create";
import { ir_transient_load } from "../ir/core/transient_load";
import { ir_transient_store } from "../ir/core/transient_store";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PostLoopPassTransientVariablePropagation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {
        ir.forEachOp(op => {
            if (op.type === ir_transient_create) {
                op.branch.func.createTransientVariable(op.inputs.variable);
            } else if (op.type === ir_transient_load || op.type === ir_transient_store) {
                op.branch.func.useTransientVariable(op.inputs.variable);
            } 
        });
    }
}
