import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { CatnipIr } from "../../compiler/CatnipIr";


export const op_breakpoint = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: {}): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: {}): void {
        ctx.emitCallback("breakpoint", () => {
            debugger;
        }, [], null);
    }
}
