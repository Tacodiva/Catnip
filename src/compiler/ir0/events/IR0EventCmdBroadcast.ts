import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrEventsBroadcast } from "../../ir1/events/IR1InstrEventsBroadcast";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0InputNothing } from "../core/IR0InputNothing";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0EventCmdBroadcast extends IR0Command<["broadcastName"]> {

    // If this is a string, the broadcast is a constant, otherwise it's a dynamic broadcast.
    public foldedBroadcastName: string | null;

    public readonly waitThreads: boolean;

    public constructor(broadcastName: IR0Input, waitThreads: boolean, foldedBroadcastName: string | null = null) {
        super("broadcast", {
            broadcastName: {
                value: broadcastName,
                format: CatnipValueFormat.I32_HSTRING
            }
        });
        this.foldedBroadcastName = foldedBroadcastName;
        this.waitThreads = waitThreads;
    }

    public preEmitIR1(emitter: IR1Emitter): void {
        const broadcastNameValue = this.args.broadcastName.getResult();

        if (!broadcastNameValue.isConstant)
            return;

        this.foldedBroadcastName = broadcastNameValue.asConstantString();
        this.args.broadcastName.input = new IR0InputNothing();
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction {
        return new IR1InstrEventsBroadcast(this.foldedBroadcastName, this.waitThreads);
    }

    public clone(ctx: IR0CloneContext): IR0Command<["broadcastName"]> {
        return new IR0EventCmdBroadcast(this.args.broadcastName.input.clone(ctx), this.waitThreads, this.foldedBroadcastName);
    }

}