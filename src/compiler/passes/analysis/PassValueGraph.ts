import { CatnipCompilerPass } from "../CatnipCompilerPass";
import { CatnipCompilerPassContext } from '../../CatnipCompilerPassContext';
import { CatnipCompilerStage } from "../../CatnipCompilerStage";

export const PassValueGraph: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_ANALYSIS,

    run(ctx: CatnipCompilerPassContext): void {
        
    }
}
