import { CatnipIr, CatnipReadonlyIr } from "./CatnipIr";


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
}