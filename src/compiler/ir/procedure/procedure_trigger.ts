import { CatnipProcedureID } from "../../../ops/procedure/procedure_definition";
import { CatnipCompilerIrGenContext } from "../../CatnipCompilerIrGenContext";
import { CatnipIr } from "../../CatnipIr";
import { CatnipIrScriptTrigger, CatnipIrScriptTriggerType } from "../../CatnipIrScriptTrigger";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerProcedureSubsystem } from "../../subsystems/CatnipCompilerProcedureSubsystem";
import { ir_barrier } from "../core/barrier";
import { ir_return } from "../core/return";
import { ir_return_yielding } from "../core/return_yielding";
import { ir_transient_load } from "../core/transient_load";

export interface CatnipIrProcedureTriggerArg {
    readonly name: string;
    readonly format: CatnipValueFormat;
    readonly variable: CatnipIrTransientVariable;
}

export type ir_procedure_trigger_inputs = {
    readonly id: CatnipProcedureID;
    readonly args: CatnipIrProcedureTriggerArg[];
    readonly warp: boolean;
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

    public requiresReturnLocation(ir: CatnipIr, inputs: ir_procedure_trigger_inputs): boolean {
        return ir.preAnalysis.isYielding;
    }
    
    public isWarp(ir: CatnipIr, inputs: ir_procedure_trigger_inputs): boolean {
        return inputs.warp;
    }

    public postIR(ctx: CatnipCompilerIrGenContext, inputs: ir_procedure_trigger_inputs): void {
        ctx.emitIr(ir_barrier, {}, {});
        if (ctx.ir.preAnalysis.isYielding) {
            ctx.emitIr(ir_transient_load, { transient: ctx.ir.returnLocationVariable }, {});
            ctx.emitIr(ir_return_yielding, {}, {});
        } else {
            ctx.emitIr(ir_return, {}, {});
        }
    }

}

export type CatnipIrScriptProcedureTrigger = CatnipIrScriptTrigger<ir_procedure_trigger_inputs, typeof ir_procedure_trigger>;