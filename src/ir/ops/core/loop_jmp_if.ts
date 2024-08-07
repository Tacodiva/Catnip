import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";

type loop_jmp_if_ir_inputs = { continues: boolean }
type loop_jmp_if_ir_branches = { branch: CatnipIrBranch }

export const ir_loop_jmp_if = new class extends CatnipIrCommandOpType<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches> {

    public constructor() { super("core_loop_jmp_if"); }
    
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches>): void {
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.func === ctx.func);
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.blockDepth !== -1);
        ctx.emitWasm(SpiderOpcodes.br_if, ctx.blockDepth - ir.branches.branch.blockDepth - 1);
    }

    public doesBranchContinue(branch: "branch", ir: CatnipIrOpBase<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches>): boolean {
        return ir.inputs.continues;
    }
}