import { CatnipCompiler } from "../../compiler/CatnipCompiler";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../../compiler/CatnipIrScriptTrigger";
import { ir_event_trigger } from "../../compiler/ir/core/event_trigger";
import { IR0Script } from "../../compiler/ir0/IR0Script";
import { IR0Trigger } from "../../compiler/ir0/IR0Trigger";
import { IR0TriggerEvent } from "../../compiler/ir0/core/IR0TriggerEvent";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

export const when_flag_clicked_trigger = new class extends CatnipScriptTriggerType<{}> {
    public createIR(script: IR0Script, inputs: {}): IR0Trigger {
        return new IR0TriggerEvent();
    }
}

registerSB3HatBlock("event_whenflagclicked", (ctx, block) => when_flag_clicked_trigger.create({}));