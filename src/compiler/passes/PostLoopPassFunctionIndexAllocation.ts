import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PostLoopPassFunctionIndexAllocation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_POST_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {
        const needsFunctionIndices = ir.functions.filter(fn => fn.needsFunctionTableIndex);
        let index = 1;

        for (const fn of needsFunctionIndices) {
            fn.setFunctionTableIndex(index++);
        }

        ir.compiler.module.createFunctionsElement(ir.functions);
    }
}
