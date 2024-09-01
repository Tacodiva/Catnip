import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreWasmPassFunctionIndexAllocation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ir: CatnipReadonlyIr): void {
        const needsFunctionIndices = ir.functions.filter(fn => fn.needsFunctionTableIndex);
        let index = 1;

        for (const fn of needsFunctionIndices) {
            fn.setFunctionTableIndex(index++);
        }

        ir.compiler.module.createFunctionsElement(ir.functions);
    }
}
