import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { ir_get_var } from "../../compiler/ir/data/get_var";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type get_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID };

export const op_get_var = new class extends CatnipInputOpType<get_var_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_var_inputs) {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_get_var, { target, variable }, {});
    }
}

registerSB3InputBlock("data_variable", (ctx, block) => {
    const varInfo = ctx.getVariable(block.fields.VARIABLE);
    return op_get_var.create({ sprite: varInfo.spriteID, variable: varInfo.variableID });
});
