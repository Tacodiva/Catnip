import { CatnipCompilerPassStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";

export interface CatnipCompilerPass {
    readonly stage: CatnipCompilerPassStage;
    readonly priority?: number;
    run(ir: CatnipReadonlyIr): void;
}