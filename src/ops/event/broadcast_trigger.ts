import { IR0TriggerBroadcast } from "../../compiler/ir0/events/IR0TriggerBroadcast";
import { IR0Script } from "../../compiler/ir0/IR0Script";
import { IR0Trigger } from "../../compiler/ir0/IR0Trigger";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

type broadcast_trigger_inputs = { broadcastName: string };

export const broadcast_trigger = new class extends CatnipScriptTriggerType<broadcast_trigger_inputs> {
    public createIR(script: IR0Script, inputs: broadcast_trigger_inputs): IR0Trigger {
        return new IR0TriggerBroadcast(inputs.broadcastName);
    }
}

registerSB3HatBlock("event_whenbroadcastreceived", (ctx, block) => broadcast_trigger.create({
    broadcastName: block.fields.BROADCAST_OPTION[0]+""
}));