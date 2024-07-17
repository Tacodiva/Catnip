

import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompiler";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { CatnipInputFlags, CatnipInputFormat } from "../../types";

type if_else_inputs = { condition: CatnipInputOp, true_branch: CatnipCommandList, false_branch: CatnipCommandList };
export const op_if_else = new class extends CatnipCommandOpType<if_else_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: if_else_inputs): void {
        ctx.emitInput(inputs.condition, CatnipInputFormat.i32, CatnipInputFlags.BOOLEAN);
        ctx.emitIrCommand(ir_if_else, {}, { true_branch: ctx.emitBranch(inputs.true_branch), false_branch: ctx.emitBranch(inputs.false_branch) });
    }
}

type if_else_branches = { true_branch: CatnipIrOp, false_branch: CatnipIrOp };

export const ir_if_else = new class extends CatnipIrCommandOpType<{}, if_else_branches> {
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, if_else_branches>): void {
        ctx.emitWasm(SpiderOpcodes.if, ctx.emitBranch(ir.branches.true_branch), ctx.emitBranch(ir.branches.false_branch));
    }
}