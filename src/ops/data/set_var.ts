
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_set_var } from "../../compiler/ir/data/set_var";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_set_var = new class extends CatnipCommandOpType<set_var_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_var_inputs): void {
        ctx.emitInput(inputs.value);
        const input = ctx.stack.peek();
        const format = input.format;

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_set_var, { target, variable, format }, {});
    }
}
