import { CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTrigger, CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerProcedureSubsystem } from "../../subsystems/CatnipCompilerProcedureSubsystem";

export interface CatnipIrProcedureTriggerArg {
    readonly name: string;
    readonly format: CatnipValueFormat;
    readonly variable: CatnipIrTransientVariable;
}

export type ir_procedure_trigger_inputs = {
    readonly id: CatnipProcedureID;
    readonly args: CatnipIrProcedureTriggerArg[];
};

export const ir_procedure_trigger = new class extends CatnipIrScriptTriggerType<ir_procedure_trigger_inputs> {

    public create(ir: CatnipIr, inputs: ir_procedure_trigger_inputs): CatnipIrScriptTrigger<ir_procedure_trigger_inputs, this> {
        const trigger = super.create(ir, inputs);
        ir.compiler.getSubsystem(CatnipCompilerProcedureSubsystem).registerProcedure(trigger);
        return trigger;
    }
    
    public requiresFunctionIndex(): boolean {
        return false;
    }
}

export type CatnipIrScriptProcedureTrigger = CatnipIrScriptTrigger<ir_procedure_trigger_inputs, typeof ir_procedure_trigger>;