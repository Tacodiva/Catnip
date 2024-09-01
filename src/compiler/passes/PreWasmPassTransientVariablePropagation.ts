import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { ir_transient_create } from "../ir/core/transient_create";
import { ir_transient_load } from "../ir/core/transient_load";
import { ir_transient_store } from "../ir/core/transient_store";
import { ir_transient_tee } from "../ir/core/transient_tee";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreWasmPassTransientVariablePropagation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ir: CatnipReadonlyIr): void {
        ir.forEachOp(op => {
            if (op.type === ir_transient_create) {
                op.branch.func.createTransientVariable(op.inputs.transient);
            } else if (op.type === ir_transient_load || op.type === ir_transient_store || op.type === ir_transient_tee) {
                op.branch.func.useTransientVariable(op.inputs.transient);
            } 
        });
    }
}
