import { CatnipCompilerPassContext } from "../../CatnipCompilerPassContext";
import { CatnipCompilerStage } from "../../CatnipCompilerStage";
import { CatnipIrExternalValueSourceType } from "../../CatnipIrFunction";
import { ir_transient_create } from "../../ir/core/transient_create";
import { CatnipCompilerPass } from "../CatnipCompilerPass";

export const PassTransientVariablePropagation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ctx: CatnipCompilerPassContext): void {
        ctx.forEachOp(op => {
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
