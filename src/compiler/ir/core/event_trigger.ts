import { CatnipScript } from "../../../runtime/CatnipScript";
import { CatnipCompiler } from "../../CatnipCompiler";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export type CatnipEventID = string;

export type ir_event_trigger_inputs = {
    id: CatnipEventID,
    priority: number,
};

export interface CatnipIrScriptEventTriggerListener<TInputs extends ir_event_trigger_inputs = ir_event_trigger_inputs> {
    ir: CatnipIr,
    inputs: TInputs,
}

export class CatnipIrScriptEventTrigger<TInputs extends ir_event_trigger_inputs> extends CatnipIrScriptTriggerType<TInputs> {
    public requiresFunctionIndex(): boolean {
        return true;
    }

    // public generateFunctions(): 

    
}

export const ir_event_trigger = new CatnipIrScriptEventTrigger<ir_event_trigger_inputs>();
