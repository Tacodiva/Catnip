import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";


export const op_erase_all = new class extends CatnipCommandOpType<{}> {
    public *getInputsAndSubstacks(inputs: {}): IterableIterator<CatnipInputOp | CatnipCommandList> { }

    public generateIr(ctx: IR0Emitter, inputs: {}): void {
        ctx.emitRequestRedraw();

        // TODO Check this doesn't import a different function every time
        ctx.emitCallbackCommand("erase_all", () => {
            ctx.compiler.runtimeModule.renderer.penEraseAll();
        }, {});
    }

}


registerSB3CommandBlock("pen_clear", (ctx, block) =>
    op_erase_all.create({})
);