import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { CatnipIr, CatnipReadonlyIr } from "./CatnipIr";
import { ir_barrier } from "./ir/core/barrier";


export type CatnipIrScriptTriggerInputs = Record<string, any>;

export interface CatnipIrScriptTrigger<
    TInputs extends CatnipIrScriptTriggerInputs = CatnipIrScriptTriggerInputs,
    TType extends CatnipIrScriptTriggerType<TInputs> = CatnipIrScriptTriggerType<TInputs>
> {
    readonly type: TType;
    readonly ir: CatnipIr;
    readonly inputs: TInputs;
}

export abstract class CatnipIrScriptTriggerType<TInputs extends CatnipIrScriptTriggerInputs> {
    public create(ir: CatnipIr, inputs: TInputs): CatnipIrScriptTrigger<TInputs, this> {
        return { type: this, ir, inputs }
    }

    public abstract requiresFunctionIndex(ir: CatnipReadonlyIr, inputs: TInputs): boolean;

    public requiresReturnLocation(ir: CatnipReadonlyIr, inputs: TInputs) {
        return false;
    }

    public preIR(ctx: CatnipCompilerIrGenContext, inputs: TInputs) {

    }

    public postIR(ctx: CatnipCompilerIrGenContext, inputs: TInputs) {
        ctx.emitIr(ir_barrier, {}, {});
    }

    public isWarp(ir: CatnipReadonlyIr, inputs: TInputs): boolean {
        return false;
    }
}