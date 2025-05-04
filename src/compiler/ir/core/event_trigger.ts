import { CatnipEventID } from "../../../CatnipEvents";
import { CatnipCompilerIrGenContext } from "../../CatnipCompilerIrGenContext";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTrigger, CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipCompilerEventTriggerSubsystem } from "../../subsystems/CatnipCompilerEventTriggerSubsystem";
import { ir_thread_terminate } from "./thread_terminate";

export type ir_event_trigger_inputs = {
    id: CatnipEventID,
    priority: number,
};

export interface CatnipIrScriptEventTriggerListener<TInputs extends ir_event_trigger_inputs = ir_event_trigger_inputs> {
    ir: CatnipIr,
    inputs: TInputs,
}

export const ir_event_trigger = new class extends CatnipIrScriptTriggerType<ir_event_trigger_inputs> {
    public create(ir: CatnipIr, inputs: ir_event_trigger_inputs): CatnipIrScriptTrigger<ir_event_trigger_inputs, this> {
        const trigger = super.create(ir, inputs);
        ir.compiler.getSubsystem(CatnipCompilerEventTriggerSubsystem).addTrigger(trigger);
        return trigger;
    }

    public requiresFunctionIndex(): boolean {
        return true;
    }

    public postIR(ctx: CatnipCompilerIrGenContext, inputs: ir_event_trigger_inputs): void {
        ctx.emitIr(ir_thread_terminate, {}, {});
    }
};

export type CatnipIrScriptEventTrigger = CatnipIrScriptTrigger<ir_event_trigger_inputs, typeof ir_event_trigger>;