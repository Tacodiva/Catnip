import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputOperatorNot } from "../../compiler/ir0/operators/IR0InputOperatorNot";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type repeat_until_inputs = { condition: CatnipInputOp, loop: CatnipCommandList };

export const op_repeat_until = new class extends CatnipCommandOpType<repeat_until_inputs> {
    public *getInputsAndSubstacks(inputs: repeat_until_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.condition;
        yield inputs.loop;
    }

    public generateIr(ctx: IR0Emitter, inputs: repeat_until_inputs): void {
        ctx.emitInlineBlock(emitter => {
            const loopHead = emitter.block;

            emitter.emitCondition(
                new IR0InputOperatorNot(emitter.emitInput(inputs.condition)),
                emitter => {
                    emitter.emitCommands(inputs.loop);
                    emitter.emitLoopYield();
                    emitter.emitFlow(loopHead);
                },
            );
        });
    }
}

registerSB3CommandBlock("control_repeat_until", (ctx, block) => op_repeat_until.create({
    condition: ctx.readInput(block.inputs.CONDITION),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
