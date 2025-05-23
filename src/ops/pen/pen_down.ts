import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";
import { ir_pen_down_up } from "../../compiler/ir/pen/pen_down_up";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";


export const op_pen_down = new class extends CatnipCommandOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_request_redraw, {}, {});
        ctx.emitIr(ir_pen_down_up, { type: "down" }, {});
    }
}


registerSB3CommandBlock("pen_penDown", (ctx, block) => 
    op_pen_down.create({})
);