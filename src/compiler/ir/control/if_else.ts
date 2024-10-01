

import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrBranch } from "../../CatnipIrBranch";

type if_else_ir_branches = { true_branch: CatnipIrBranch, false_branch: CatnipIrBranch | null };

export const ir_if_else = new class extends CatnipIrCommandOpType<{}, if_else_ir_branches> {

    public constructor() { super("control_if_else"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, if_else_ir_branches>): void {
        if (ir.branches.false_branch.body.head !== null) {

            if (ir.branches.true_branch.body.doesContinue()) {
                ctx.emitWasm(SpiderOpcodes.if,
                    ctx.emitBranch(ir.branches.true_branch),
                    ctx.emitBranch(ir.branches.false_branch)
                );
            } else {
                ctx.emitWasm(SpiderOpcodes.if,
                    ctx.emitBranch(ir.branches.true_branch),
                );
                ctx.emitBranchInline(ir.branches.false_branch);
            }
        } else {
            ctx.emitWasm(SpiderOpcodes.if,
                ctx.emitBranch(ir.branches.true_branch)
            );
        }
    }
}