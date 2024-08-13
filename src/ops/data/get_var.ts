import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_var } from "../../compiler/ir/data/get_var";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { CatnipInputOpType } from "../CatnipOp";

type get_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID };

export const op_get_var = new class extends CatnipInputOpType<get_var_inputs> {

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_var_inputs) {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_get_var, { target, variable }, {});
    }
}
