import { CatnipIr } from "../compiler/CatnipIr";
import { CatnipIrScriptTrigger } from "../compiler/CatnipIrScriptTrigger";

export type CatnipScriptTriggerInputs = Record<string, any>;

export interface CatnipScriptTrigger<TInputs extends CatnipScriptTriggerInputs = CatnipScriptTriggerInputs> {
    readonly type: CatnipScriptTriggerType<TInputs>;
    readonly inputs: TInputs;
}

export abstract class CatnipScriptTriggerType<TInputs extends CatnipScriptTriggerInputs> {
    public create(inputs: TInputs): CatnipScriptTrigger<TInputs> {
        return { type: this, inputs }
    }

    public abstract createTriggerIR(ir: CatnipIr, inputs: TInputs): CatnipIrScriptTrigger;
}