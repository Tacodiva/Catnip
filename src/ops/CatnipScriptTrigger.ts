import { IR0Script } from "../compiler/ir0/IR0";
import { IR0Trigger } from "../compiler/ir0/IR0Trigger";

export type CatnipScriptTriggerInputs = Record<string, any>;

export interface CatnipScriptTrigger<TInputs extends CatnipScriptTriggerInputs = CatnipScriptTriggerInputs> {
    readonly type: CatnipScriptTriggerType<TInputs>;
    readonly inputs: TInputs;
}

export abstract class CatnipScriptTriggerType<TInputs extends CatnipScriptTriggerInputs> {
    public create(inputs: TInputs): CatnipScriptTrigger<TInputs> {
        return { type: this, inputs }
    }

    public abstract createIR(script: IR0Script, inputs: TInputs): IR0Trigger;
}