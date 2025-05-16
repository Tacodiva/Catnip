import { CatnipCompilerPassContext } from "../CatnipCompilerPassContext";
import { CatnipCompilerPassStage } from "../CatnipCompilerStage";

export interface CatnipCompilerPass {
    readonly stage: CatnipCompilerPassStage;
    readonly priority?: number;
    run(ctx: CatnipCompilerPassContext): void;
}