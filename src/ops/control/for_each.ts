import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { IR0CmdTransientSet } from "../../compiler/ir0/core/IR0CmdTransientSet";
import { IR0InputTransientGet } from "../../compiler/ir0/core/IR0InputTransientGet";
import { IR0CmdDataVariableSet } from "../../compiler/ir0/data/IR0CmdDataVariableSet";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputOperatorAdd } from "../../compiler/ir0/operators/IR0InputOperatorAdd";
import { IR0InputOperatorCmpLt } from '../../compiler/ir0/operators/IR0InputOperatorCmpLt';
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type for_each_inputs = { variableSprite: CatnipSpriteID, variable: CatnipVariableID, count: CatnipInputOp, loop: CatnipCommandList };

export const op_for_each = new class extends CatnipCommandOpType<for_each_inputs> {
    public *getInputsAndSubstacks(inputs: for_each_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.count;
        yield inputs.loop;
    }

    public generateIr(ctx: IR0Emitter, inputs: for_each_inputs): void {

        const loopCount = ctx.emitTransientCreate("lc", CatnipValueFormat.F64_NUMBER);
        const loopIndex = ctx.emitTransientCreate("index", CatnipValueFormat.F64_NUMBER);

        ctx.emitCommand(new IR0CmdTransientSet(loopCount, ctx.emitInput(inputs.count)));

        ctx.emitCommand(new IR0CmdTransientSet(loopIndex, ctx.emitConst(0)));

        ctx.emitInlineBlock(emitter => {
            const loopHead = emitter.block;

            // if (loopIndex < loopCount)
            emitter.emitCondition(
                new IR0InputOperatorCmpLt(
                    new IR0InputTransientGet(loopIndex),
                    new IR0InputTransientGet(loopCount),
                ),

                emitter => {
                    // loopIndex = loopIndex + 1
                    ctx.emitCommand(new IR0CmdTransientSet(loopIndex,
                        new IR0InputOperatorAdd(
                            new IR0InputTransientGet(loopIndex),
                            emitter.emitConst(1)
                        )
                    ));

                    // var = loopIndex
                    const varSprite = ctx.project.getSprite(inputs.variableSprite)!;
                    const varTarget = varSprite.defaultTarget;
                    const variable = varSprite.getVariable(inputs.variable)!;

                    ctx.emitCommand(new IR0CmdDataVariableSet(varTarget, variable, new IR0InputTransientGet(loopIndex)));

                    ctx.emitCommands(inputs.loop);

                    ctx.emitLoopYield();
                    ctx.emitFlow(loopHead);
                }
            );
        });
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
