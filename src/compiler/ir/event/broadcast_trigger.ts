import { CatnipCompilerIrGenContext } from "../../CatnipCompilerIrGenContext";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTrigger, CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipCompilerBroadcastSubsystem } from "../../subsystems/CatnipCompilerBroadcastSubsystem";
import { ir_thread_terminate } from "../core/thread_terminate";


export type ir_broadcast_trigger_inputs = {
    readonly name: string;
    readonly priority: number;
};

export const ir_broadcast_trigger = new class extends CatnipIrScriptTriggerType<ir_broadcast_trigger_inputs> {

    public create(ir: CatnipIr, inputs: ir_broadcast_trigger_inputs): CatnipIrScriptTrigger<ir_broadcast_trigger_inputs, this> {
        const trigger = super.create(ir, inputs);
        ir.compiler.getSubsystem(CatnipCompilerBroadcastSubsystem).registerBroadcastTrigger(trigger);
        return trigger;
    }
    
    public requiresFunctionIndex(): boolean {
        return true;
    }

    public postIR(ctx: CatnipCompilerIrGenContext, inputs: ir_broadcast_trigger_inputs): void {
        ctx.emitIr(ir_thread_terminate, {}, {});
    }
}

export type CatnipIrScriptBroadcastTrigger = CatnipIrScriptTrigger<ir_broadcast_trigger_inputs, typeof ir_broadcast_trigger>;