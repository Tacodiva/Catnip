import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipReadonlyIr } from "../CatnipIr";
import { CatnipIrBranch, CatnipIrBranchType, CatnipIrInternalBranch } from "../CatnipIrBranch";
import { ir_yield, yield_ir_branches, yield_ir_inptus } from "../ir/core/yield";
import { CatnipCompilerPass } from "./CatnipCompilerPass";

export const PreWasmPassFunctionIndexAllocation: CatnipCompilerPass = {

    stage: CatnipCompilerStage.PASS_PRE_WASM_GEN,

    run(ir: CatnipReadonlyIr): void {

        if (ir.trigger.type.requiresFunctionIndex(ir, ir.trigger.inputs))
            ir.entrypoint.assignFunctionTableIndex();

        ir.forEachOp(op => {

            if (op.type === ir_yield) {
                const branch = (op.branches as yield_ir_branches).branch;
                const inputs = op.inputs as yield_ir_inptus;

                if (branch.body.func.hasFunctionTableIndex) return;

                if (inputs.status === CatnipWasmEnumThreadStatus.RUNNING && ir.compiler.config.enable_tail_call)
                    return;

                branch.body.func.assignFunctionTableIndex();
            } else {

                function checkBranch(branch: CatnipIrBranch) {
                    if (branch.branchType === CatnipIrBranchType.EXTERNAL) {
                        if (branch.returnLocation !== null)
                            checkBranch(branch.returnLocation);
                    } else {
                        branch.body.func.assignFunctionTableIndex();
                    }
                }

                for (const branchName of Object.keys(op.branches)) {
                    const branch = op.branches[branchName];
                    if (branch.branchType === CatnipIrBranchType.EXTERNAL) {
                        if (branch.returnLocation !== null)
                            checkBranch(branch.returnLocation);
                    }
                }
            }
        });
    }
}
