import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const LoopPassVariableInlining: CatnipCompilerPass = {
    stage: CatnipCompilerStage.PASS_ANALYSIS_LOOP,

    run(ir: CatnipReadonlyIr): void {
        
    }
}