import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputConst, IR0CmdLog } from "../../compiler/ir0/ops/log";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipOp } from "../CatnipOp";

type forever_inputs = { loop: CatnipCommandList };

export const op_forever = new class extends CatnipCommandOpType<forever_inputs> {
    public generateIr(ctx: IR0Emitter, inputs: forever_inputs): void {

        ctx.emitInlineBlock(ctx => {
            const loopBlock = ctx.block;

            ctx.emitCommands(inputs.loop);
            ctx.emitLoopYield();

            ctx.emitFlow(loopBlock);
        });
    }
}

registerSB3CommandBlock("control_forever", (ctx, block) => op_forever.create({
    loop: ctx.readStack(block.inputs.SUBSTACK)
}));
