
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_set_xy } from "../../compiler/ir/motion/set_xy";

type goto_xy_inputs = { x: CatnipInputOp, y: CatnipInputOp };

export const op_goto_xy = new class extends CatnipCommandOpType<goto_xy_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: goto_xy_inputs): IterableIterator<CatnipOp> {
        yield inputs.x;
        yield inputs.y;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: goto_xy_inputs): void {
        ctx.emitInput(inputs.x, CatnipValueFormat.I32_NUMBER);
        ctx.emitInput(inputs.y, CatnipValueFormat.I32_NUMBER);

        ctx.emitIr(ir_set_xy, { }, {});
    }
}

registerSB3CommandBlock("motion_gotoxy", (ctx, block) =>
    op_goto_xy.create({
        x: ctx.readInput(block.inputs.X),
        y: ctx.readInput(block.inputs.Y),
    })
);
