import { Cast } from "../../compiler/cast";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../../compiler/CatnipIrScriptTrigger";
import { ir_key_pressed_trigger } from "../../compiler/ir/event/key_pressed_trigger";
import { registerSB3HatBlock } from "../../sb3_ops";
import { CatnipScriptTriggerType } from "../CatnipScriptTrigger";



type when_key_pressed_inputs = { key: string };

export const when_key_pressed_trigger = new class extends CatnipScriptTriggerType<when_key_pressed_inputs> {

    public createTriggerIR(ir: CatnipIr, inputs: when_key_pressed_inputs): CatnipIrScriptTrigger {

        let key: number | null;

        if (inputs.key === "any") {
            key = null;
        } else {
            key = Cast.toKeyCode(inputs.key);
        }

        return ir_key_pressed_trigger.create(ir, {
            key
        })
    }
}

registerSB3HatBlock("event_whenkeypressed", (ctx, block) => when_key_pressed_trigger.create({ key: "" + block.fields.KEY_OPTION[0] }));