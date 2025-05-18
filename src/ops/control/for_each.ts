import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_if_else } from "../../compiler/ir/control/if_else";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { ir_transient_tee } from "../../compiler/ir/core/transient_tee";
import { ir_cmp_lt } from "../../compiler/ir/operators/cmp_lt";
import { ir_transient_load } from "../../compiler/ir/core/transient_load";
import { ir_add } from "../../compiler/ir/operators/add";
import { ir_set_var } from "../../compiler/ir/data/set_var";

type for_each_inputs = { variableSprite: CatnipSpriteID, variable: CatnipVariableID, count: CatnipInputOp, loop: CatnipCommandList };

export const op_for_each = new class extends CatnipCommandOpType<for_each_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: for_each_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.count;
        yield inputs.loop;
    }

    public isYielding(ir: CatnipIr): boolean {
        return ir.compiler.config.enable_warp_timer || !ir.isWarp;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: for_each_inputs): void {

        const loopCount = ctx.emitTransientCreate(CatnipValueFormat.F64_NUMBER_OR_NAN, "Loop Count");
        const loopIndex = ctx.emitTransientCreate(CatnipValueFormat.F64_NUMBER_OR_NAN, "Loop Index");

        ctx.emitIrConst(0, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_transient_tee, { transient: loopIndex }, {});
        
        ctx.emitInput(inputs.count, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_transient_tee, { transient: loopCount }, {});

        ctx.emitIr(ir_cmp_lt, {}, {});

        ctx.emitIr(
            ir_if_else, {},
            {
                true_branch: ctx.emitBranch((loopHead) => {
                    ctx.emitIr(ir_transient_load, { transient: loopIndex }, {});
                    ctx.emitIrConst(1, CatnipValueFormat.F64_NUMBER);
                    ctx.emitIr(ir_add, {}, {});

                    ctx.emitIr(ir_transient_tee, { transient: loopIndex }, {});

                    const varSprite = ctx.project.getSprite(inputs.variableSprite)!;
                    const varTarget = varSprite.defaultTarget;
                    const variable = varSprite.getVariable(inputs.variable)!;
            
                    ctx.emitIr(ir_set_var, { target: varTarget, variable }, {});

                    ctx.emitCommands(inputs.loop);
                    ctx.emitLoopYield();

                    ctx.emitIr(ir_transient_load, { transient: loopIndex }, {});
                    ctx.emitIr(ir_transient_load, { transient: loopCount }, {});
                    ctx.emitIr(ir_cmp_lt, {}, {});

                    ctx.emitConditionalJump(loopHead);
                }),
                false_branch: ctx.emitBranch(),
            }
        )
    }
}

registerSB3CommandBlock("control_for_each", (ctx, block) => {
    const varInfo = ctx.getVariable(block.fields.VARIABLE);
    return op_for_each.create({
        variableSprite: varInfo.spriteID,
        variable: varInfo.variableID,
        count: ctx.readInput(block.inputs.VALUE),
        loop: ctx.readStack(block.inputs.SUBSTACK),
    });
});
