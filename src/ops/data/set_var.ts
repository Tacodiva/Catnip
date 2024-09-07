
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_set_var } from "../../compiler/ir/data/set_var";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";
import { registerSB3CommandBlock, registerSB3InputBlock } from "../../sb3_ops";

type set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_set_var = new class extends CatnipCommandOpType<set_var_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_var_inputs): void {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_set_var, { target, variable }, {});
    }
}

registerSB3CommandBlock("data_setvariableto", (ctx, block) => {
    const varInfo = ctx.getVariable(block.fields.VARIABLE);
    return op_set_var.create({
        sprite: varInfo.spriteID,
        variable: varInfo.variableID,
        value: ctx.readInput(block.inputs.VALUE)
    });
});
