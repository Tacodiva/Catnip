import { IR0CmdDataVariableGet } from "../../compiler/ir0/data/IR0CmdDataVariableGet";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType } from "../CatnipOp";

type get_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID };

export const op_get_var = new class extends CatnipInputOpType<get_var_inputs> {
    public *getInputsAndSubstacks() { }

    public generateIr(ctx: IR0Emitter, inputs: get_var_inputs) {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        return new IR0CmdDataVariableGet(target, variable);
    }
}

registerSB3InputBlock("data_variable", (ctx, block) => {
    const varInfo = ctx.getVariable(block.fields.VARIABLE);
    return op_get_var.create({ sprite: varInfo.spriteID, variable: varInfo.variableID });
});
