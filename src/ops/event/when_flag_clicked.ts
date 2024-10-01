import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../../compiler/CatnipIrScriptTrigger";
import { ir_event_trigger } from "../../compiler/ir/core/event_trigger";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

export const when_flag_clicked_trigger = new class extends CatnipScriptTriggerType<{}> {
    public createTriggerIR(ir: CatnipIr): CatnipIrScriptTrigger {
        return ir_event_trigger.create(ir, {
            id: "when_flag_clicked",
            priority: 0,
        })
    }
}

registerSB3HatBlock("event_whenflagclicked", (ctx, block) => when_flag_clicked_trigger.create({}));