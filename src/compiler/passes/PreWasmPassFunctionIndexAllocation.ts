import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { ir_yield, yield_ir_branches, yield_ir_inptus } from "../ir/core/yield";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreWasmPassFunctionIndexAllocation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ir: CatnipReadonlyIr): void {

        if (!ir.entrypoint.hasFunctionTableIndex)
            ir.entrypoint.assignFunctionTableIndex();
        
        ir.forEachOp(op => {

            if (op.type !== ir_yield)
                return;

            const branch = (op.branches as yield_ir_branches).branch;
            const inputs = op.inputs as yield_ir_inptus;

            if (branch.func.hasFunctionTableIndex) return;

            if (inputs.status === CatnipWasmEnumThreadStatus.RUNNING && ir.compiler.config.enable_tail_call)
                return;

            branch.func.assignFunctionTableIndex();
        });
    }
}
