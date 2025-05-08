
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_set_xy } from "../../compiler/ir/motion/set_xy";
import { ir_get_xy } from "../../compiler/ir/motion/get_xy";

type set_y_inputs = { y: CatnipInputOp };

export const op_set_y = new class extends CatnipCommandOpType<set_y_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: set_y_inputs): IterableIterator<CatnipOp> {
        yield inputs.y;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_y_inputs): void {
        ctx.emitIr(ir_get_xy, { axis: "x" }, {});
        ctx.emitInput(inputs.y, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_set_xy, { }, {});
    }
}

registerSB3CommandBlock("motion_sety", (ctx, block) =>
    op_set_y.create({
        y: ctx.readInput(block.inputs.Y),
    })
);
