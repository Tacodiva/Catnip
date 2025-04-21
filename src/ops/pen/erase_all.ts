import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";


export const op_erase_all = new class extends CatnipCommandOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitCallback("pen erase all", () => {
            ctx.compiler.runtimeModule.renderer.penEraseAll();
        }, [], null);
    }
}


registerSB3CommandBlock("pen_clear", (ctx, block) => 
    op_erase_all.create({})
);