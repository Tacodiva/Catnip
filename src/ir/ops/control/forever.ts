import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipCommandList, CatnipCommandOpType } from "../../CatnipOp";
import { ir_const } from "../core/const";
import { ir_if_else } from "./if_else";
import { CatnipInputFlags, CatnipInputFormat } from "../../types";

type forever_inputs = { loop: CatnipCommandList };

export const op_forever = new class extends CatnipCommandOpType<forever_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: forever_inputs): void {
        ctx.emitIrCommand(
            ir_forever, {},
            {
                loop: ctx.emitComplexBranch((loopHead) => {
                    ctx.emitCommands(inputs.loop);
                    ctx.emitIrInput(ir_const, {value: 0}, CatnipInputFormat.i32, CatnipInputFlags.BOOLEAN, {});
                    ctx.emitIrCommand(ir_if_else, {}, {
                        true_branch: ctx.emitComplexBranch(() => {
                            ctx.emitJump(loopHead);
                        }),
                        false_branch: ctx.emitBranch([])
                    });
                })
            }
        );
    }
}

type forever_ir_branches = { loop: CatnipIrBranch }

export const ir_forever = new class extends CatnipIrCommandOpType<{}, forever_ir_branches> {

    public constructor() { super("control_forever"); }
    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<{}, forever_ir_branches>): void {
        ctx.emitBranchInline(ir.branches.loop);
    }

    public doesBranchContinue(branch: "loop", ir: CatnipIrOpBase<{}, forever_ir_branches>): boolean {
        // return false;
        return true;
    }
}