
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_set_var } from "../../compiler/ir/data/set_var";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock, registerSB3InputBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { ir_get_var } from "../../compiler/ir/data/get_var";
import { ir_add } from "../../compiler/ir/operators/add";

type change_var_by_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_change_var_by = new class extends CatnipCommandOpType<change_var_by_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: change_var_by_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: change_var_by_inputs): void {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_get_var, { target, variable }, {});
        ctx.emitIr(ir_add, {}, {});

        ctx.emitIr(ir_set_var, { target, variable }, {});
    }
}

registerSB3CommandBlock("data_changevariableby", (ctx, block) => {
    const varInfo = ctx.getVariable(block.fields.VARIABLE);
    return op_change_var_by.create({
        sprite: varInfo.spriteID,
        variable: varInfo.variableID,
        value: ctx.readInput(block.inputs.VALUE)
    });
});
