

import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";

type if_else_inputs = { condition: CatnipInputOp, true_branch: CatnipCommandList, false_branch?: CatnipCommandList };

export const op_if_else = new class extends CatnipCommandOpType<if_else_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: if_else_inputs): void {
        ctx.emitInput(inputs.condition, CatnipValueFormat.i32, CatnipValueFlags.BOOLEAN);
        ctx.emitIr(
            ir_if_else, {},
            {
                true_branch: ctx.emitBranch(inputs.true_branch),
                false_branch: inputs.false_branch ? ctx.emitBranch(inputs.false_branch) : null
            }
        );
    }
}

type if_else_ir_branches = { true_branch: CatnipIrBranch, false_branch: CatnipIrBranch | null };

export const ir_if_else = new class extends CatnipIrCommandOpType<{}, if_else_ir_branches> {

    public constructor() { super("control_if_else"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, if_else_ir_branches>): void {
        if (ir.branches.false_branch !== null) {
            ctx.emitWasm(SpiderOpcodes.if,
                ctx.emitBranch(ir.branches.true_branch),
                ctx.emitBranch(ir.branches.false_branch)
            );
        } else {
            ctx.emitWasm(SpiderOpcodes.if,
                ctx.emitBranch(ir.branches.true_branch)
            );
        }
    }
}