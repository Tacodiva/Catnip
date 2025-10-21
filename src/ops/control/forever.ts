import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType } from "../CatnipOp";

type forever_inputs = { loop: CatnipCommandList };

export const op_forever = new class extends CatnipCommandOpType<forever_inputs> {
    public *getInputsAndSubstacks(inputs: forever_inputs) {
        yield inputs.loop;
    }

    public generateIr(ctx: IR0Emitter, inputs: forever_inputs): void {

        ctx.emitInlineBlock(ctx => {
            const loopHead = ctx.block;

            ctx.emitCommands(inputs.loop);
            ctx.emitLoopYield();

            ctx.emitFlow(loopHead);
        });
    }
}

registerSB3CommandBlock("control_forever", (ctx, block) => op_forever.create({
    loop: ctx.readStack(block.inputs.SUBSTACK)
}));
