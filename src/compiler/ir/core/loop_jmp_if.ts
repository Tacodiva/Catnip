import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";

type loop_jmp_if_ir_inputs = { continues: boolean }
type loop_jmp_if_ir_branches = { branch: CatnipIrBranch }

export const ir_loop_jmp_if = new class extends CatnipIrCommandOpType<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches> {

    public constructor() { super("core_loop_jmp_if"); }
    
    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches>): void {
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.func === ctx.func);
        CatnipCompilerWasmGenContext.logger.assert(ir.branches.branch.blockDepth !== -1);
        ctx.emitWasm(SpiderOpcodes.br_if, ctx.blockDepth - ir.branches.branch.blockDepth - 1);
    }

    public doesBranchContinue(branch: "branch", ir: CatnipIrOp<loop_jmp_if_ir_inputs, loop_jmp_if_ir_branches>): boolean {
        return ir.inputs.continues;
    }
}