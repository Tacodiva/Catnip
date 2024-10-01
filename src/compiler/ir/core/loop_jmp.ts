import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType } from "../../CatnipIrOp";
import { CatnipIrBranch, CatnipIrBranchType } from "../../CatnipIrBranch";

type loop_jmp_ir_branches = { branch: CatnipIrBranch }

export const ir_loop_jmp = new class extends CatnipIrCommandOpType<{}, loop_jmp_ir_branches> {

    public constructor() { super("core_loop_jmp"); }
    
    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, loop_jmp_ir_branches>): void {
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.branchType === CatnipIrBranchType.INTERNAL);
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.body.func === ctx.func);
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.body.blockDepth !== -1);
        ctx.emitWasm(SpiderOpcodes.br, ctx.blockDepth - ir.branches.branch.body.blockDepth - 1);
    }

    public doesContinue(): boolean {
        return false;
    }
}