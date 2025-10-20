
import { IR0CmdDataVariableSet } from "../../compiler/ir0/data/IR0CmdDataVariableSet";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_set_var = new class extends CatnipCommandOpType<set_var_inputs> {
    public *getInputsAndSubstacks(inputs: set_var_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: set_var_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitCommand(new IR0CmdDataVariableSet(target, variable, ctx.emitInput(inputs.value)));
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
