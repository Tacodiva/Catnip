import { CatnipCompilerPassStage } from "../CatnipCompilerStage";
import { CatnipIr } from "../CatnipIr";

export interface CatnipCompilerPass {
    readonly stage: CatnipCompilerPassStage;
    readonly priority?: number;
    run(ir: CatnipIr): void;
}