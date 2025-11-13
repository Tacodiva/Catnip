import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrEventsBroadcast } from "../../ir1/events/IR1InstrEventsBroadcast";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0EventCmdBroadcast extends IR0Command<["broadcastName"]> {

    public readonly waitThreads: boolean;

    public constructor(broadcastName: IR0Input, waitThreads: boolean) {
        super("broadcast", {
            broadcastName: {
                value: broadcastName,
                format: CatnipValueFormat.I32_HSTRING
            }
        });
        this.waitThreads = waitThreads;
    }

    public emitIR1(emitter: IR1Emitter): void {
        
        const broadcastNameResult = this.args.broadcastName.getResult();

        if (broadcastNameResult.isConstant) {
            emitter.emitIR1(new IR1InstrEventsBroadcast(broadcastNameResult.asConstantString(), this.waitThreads));
        } else {
            emitter.emitInput(this.args.broadcastName);
            emitter.emitIR1(new IR1InstrEventsBroadcast(null, this.waitThreads));
        }
    }

    public clone(ctx: IR0CloneContext): IR0Command<["broadcastName"]> {
        return new IR0EventCmdBroadcast(this.args.broadcastName.input.clone(ctx), this.waitThreads);
    }

}