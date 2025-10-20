import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { CatnipCommandOpType } from "../CatnipOp";


export const op_breakpoint = new class extends CatnipCommandOpType<{}> {
    private readonly callback = () => { debugger; };
    
    public *getInputsAndSubstacks() {}

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitCallbackCommand("breakpoint", this.callback, {});
    }
}
