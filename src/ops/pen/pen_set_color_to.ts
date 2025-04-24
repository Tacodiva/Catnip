import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_cast } from "../../compiler/ir/core/cast";
import { ir_log } from "../../compiler/ir/core/log";
import { ir_pen_down_up } from "../../compiler/ir/pen/pen_down_up";
import { ir_pen_set_color } from "../../compiler/ir/pen/pen_set_color";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type pen_set_color_to = { color: CatnipInputOp };


export const op_pen_set_color_to = new class extends CatnipCommandOpType<pen_set_color_to> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: pen_set_color_to): IterableIterator<CatnipOp> {
        yield inputs.color;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: pen_set_color_to): void {
        ctx.emitInput(inputs.color, CatnipValueFormat.I32_COLOR);
        ctx.emitIr(ir_pen_set_color, {}, {});
    }
}


registerSB3CommandBlock("pen_setPenColorToColor", (ctx, block) => 
    op_pen_set_color_to.create({
        color: ctx.readInput(block.inputs.COLOR)
    })
);