import { CatnipCompilerIrGenContext } from "../../CatnipCompilerIrGenContext";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTrigger, CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipCompilerKeyTriggerSubsystem } from "../../subsystems/CatnipCompilerKeyTriggerSubsystem";
import { ir_thread_terminate } from "../core/thread_terminate";


export type ir_key_pressed_trigger_inputs = {
    readonly key: number | null; // 'null' mean any key
};

export const ir_key_pressed_trigger = new class extends CatnipIrScriptTriggerType<ir_key_pressed_trigger_inputs> {

    public create(ir: CatnipIr, inputs: ir_key_pressed_trigger_inputs): CatnipIrScriptTrigger<ir_key_pressed_trigger_inputs, this> {
        const trigger = super.create(ir, inputs);
        ir.compiler.getSubsystem(CatnipCompilerKeyTriggerSubsystem).registerTrigger(trigger);
        return trigger;
    }
    
    public requiresFunctionIndex(): boolean {
        return true;
    }

    public postIR(ctx: CatnipCompilerIrGenContext, inputs: ir_key_pressed_trigger_inputs): void {
        ctx.emitIr(ir_thread_terminate, {}, {});
    }
}

export type CatnipIrScriptKeyPressedTrigger = CatnipIrScriptTrigger<ir_key_pressed_trigger_inputs, typeof ir_key_pressed_trigger>;