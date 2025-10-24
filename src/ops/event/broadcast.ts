import { IR0EventCmdBroadcast } from "../../compiler/ir0/events/IR0EventCmdBroadcast";
import { IR0TriggerBroadcast } from "../../compiler/ir0/events/IR0TriggerBroadcast";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type broadcast_inputs = { broadcastName: CatnipInputOp };

export const op_event_broadcast = new class extends CatnipCommandOpType<broadcast_inputs> {

    public *getInputsAndSubstacks(inputs: broadcast_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.broadcastName;
    }

    public generateIr(ctx: IR0Emitter, inputs: broadcast_inputs): void {
        ctx.emitCommand(new IR0EventCmdBroadcast(ctx.emitInput(inputs.broadcastName), false));
    }
}

registerSB3CommandBlock("event_broadcast", (ctx, block) => op_event_broadcast.create({
    broadcastName: ctx.readInput(block.inputs.BROADCAST_INPUT)
}));