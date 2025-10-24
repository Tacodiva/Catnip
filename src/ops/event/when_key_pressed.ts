import { Cast } from "../../compiler/cast";
import { IR0TriggerKeyPress } from "../../compiler/ir0/events/IR0TriggerKeyPress";
import { IR0Script } from "../../compiler/ir0/IR0Script";
import { IR0Trigger } from "../../compiler/ir0/IR0Trigger";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";

type when_key_pressed_inputs = { key: string };

export const when_key_pressed_trigger = new class extends CatnipScriptTriggerType<when_key_pressed_inputs> {
    public createIR(script: IR0Script, inputs: when_key_pressed_inputs): IR0Trigger {
        let key: number | null;

        if (inputs.key === "any") {
            key = null;
        } else {
            key = Cast.toKeyCode(inputs.key);
        }

        return new IR0TriggerKeyPress(key);
    }
}

registerSB3HatBlock("event_whenkeypressed", (ctx, block) => when_key_pressed_trigger.create({ key: "" + block.fields.KEY_OPTION[0] }));