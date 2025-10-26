import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type while_inputs = { condition: CatnipInputOp, loop: CatnipCommandList };

export const op_while = new class extends CatnipCommandOpType<while_inputs> {
    public *getInputsAndSubstacks(inputs: while_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.condition;
        yield inputs.loop;
    }

    public generateIr(ctx: IR0Emitter, inputs: while_inputs): void {
        ctx.emitInlineBlock(emitter => {
            const loopHead = emitter.block;

            emitter.emitCondition(
                emitter.emitInput(inputs.condition),
                emitter => {
                    emitter.emitCommands(inputs.loop);
                    emitter.emitLoopYield();
                    emitter.emitFlow(loopHead);
                },
            );
        });
    }
}

registerSB3CommandBlock("control_while", (ctx, block) => op_while.create({
    condition: ctx.readInput(block.inputs.CONDITION),
    loop: ctx.readStack(block.inputs.SUBSTACK),
}));
