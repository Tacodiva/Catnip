import { CatnipCompilerPassContext } from "../../CatnipCompilerPassContext";
import { CatnipCompilerStage } from "../../CatnipCompilerStage";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { ir_const } from "../../ir/core/const";
import { CatnipCompilerPass } from "../CatnipCompilerPass";
import { analyzeBlockStack } from "../StackAnalysis";


export const AnalysisPassConstantFolding: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_ANALYSIS,

    run(ctx: CatnipCompilerPassContext): void {
        
    }
}
