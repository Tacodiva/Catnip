import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { CatnipIr } from "../../compiler/CatnipIr";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";


export const op_breakpoint = new class extends CatnipCommandOpType<{}> {
    private readonly callback = () => { debugger; };
    
    public *getInputsAndSubstacks() {}

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitCallbackCommand("breakpoint", this.callback, {});
    }
}
