import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";


export const op_erase_all = new class extends CatnipCommandOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_request_redraw, {}, {});
        
        // TODO This also needs to clear the pen line buffer
        ctx.emitCallback("pen erase all", () => {
            ctx.compiler.runtimeModule.renderer.penEraseAll();
        }, [], null);
    }
}


registerSB3CommandBlock("pen_clear", (ctx, block) => 
    op_erase_all.create({})
);