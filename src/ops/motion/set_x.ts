
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_set_xy } from "../../compiler/ir/motion/set_xy";
import { ir_get_xy } from "../../compiler/ir/motion/get_xy";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";

type set_x_inputs = { x: CatnipInputOp };

export const op_set_x = new class extends CatnipCommandOpType<set_x_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: set_x_inputs): IterableIterator<CatnipOp> {
        yield inputs.x;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_x_inputs): void {
        ctx.emitInput(inputs.x, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_get_xy, { axis: "y" }, {});
        ctx.emitIr(ir_set_xy, { }, {});
        ctx.emitIr(ir_request_redraw, {}, {});
    }
}

registerSB3CommandBlock("motion_setx", (ctx, block) =>
    op_set_x.create({
        x: ctx.readInput(block.inputs.X),
    })
);
