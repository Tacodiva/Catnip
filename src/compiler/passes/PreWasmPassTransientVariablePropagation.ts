import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipIr } from "../CatnipIr";
import { CatnipIrExternalValueSourceType } from "../CatnipIrFunction";
import { ir_transient_create } from "../ir/core/transient_create";
import { ir_transient_load } from "../ir/core/transient_load";
import { ir_transient_store } from "../ir/core/transient_store";
import { ir_transient_tee } from "../ir/core/transient_tee";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreWasmPassTransientVariablePropagation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ir: CatnipIr): void {
        ir.forEachOp(op => {
            if (op.type === ir_transient_create) {
                op.block.func.createTransientVariable(op.inputs.transient);
            } else {

                for (const transient of op.type.getTransientVariables(op)) {
                    op.block.func.sourceExternalValue({
                        type: CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE,
                        variable: transient
                    });
                }
                
            }
        });
    }
}
