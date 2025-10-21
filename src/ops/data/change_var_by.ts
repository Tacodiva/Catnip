
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdDataVariableSet } from "../../compiler/ir0/data/IR0CmdDataVariableSet";
import { IR0InputDataVariableGet } from "../../compiler/ir0/data/IR0InputDataVariableGet";
import { IR0InputOperatorAdd } from "../../compiler/ir0/operators/IR0InputOperatorAdd";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type change_var_by_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_change_var_by = new class extends CatnipCommandOpType<change_var_by_inputs> {
    public *getInputsAndSubstacks(inputs: change_var_by_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: change_var_by_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitCommand(new IR0CmdDataVariableSet(target, variable, 
            new IR0InputOperatorAdd(
                new IR0InputDataVariableGet(target, variable),
                ctx.emitInput(inputs.value)
            )
        ));
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
