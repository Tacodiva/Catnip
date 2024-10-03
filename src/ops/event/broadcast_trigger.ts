import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../../compiler/CatnipIrScriptTrigger";
import { ir_broadcast_trigger } from "../../compiler/ir/event/broadcast_trigger";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

type broadcast_trigger_inputs = { broadcastName: string };

export const broadcast_trigger = new class extends CatnipScriptTriggerType<broadcast_trigger_inputs> {
    public createTriggerIR(ir: CatnipIr, inputs: broadcast_trigger_inputs): CatnipIrScriptTrigger {
        return ir_broadcast_trigger.create(ir, {
            name: inputs.broadcastName,
            priority: 0
        })
    }
}
registerSB3HatBlock("event_whenbroadcastreceived", (ctx, block) => broadcast_trigger.create({
    broadcastName: block.fields.BROADCAST_OPTION[0]+""
}));