
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_set_xy } from "../../compiler/ir/motion/set_xy";
import { ir_get_xy } from "../../compiler/ir/motion/get_xy";
import { ir_add } from "../../compiler/ir/operators/add";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";

type change_y_inputs = { y: CatnipInputOp };

export const op_change_y = new class extends CatnipCommandOpType<change_y_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: change_y_inputs): IterableIterator<CatnipOp> {
        yield inputs.y;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: change_y_inputs): void {
        ctx.emitIr(ir_get_xy, { axis: "x" }, {});
        ctx.emitIr(ir_get_xy, { axis: "y" }, {});
        ctx.emitInput(inputs.y, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_add, {}, {});
        ctx.emitIr(ir_set_xy, { }, {});
        ctx.emitIr(ir_request_redraw, {}, {});
    }
}

registerSB3CommandBlock("motion_changeyby", (ctx, block) =>
    op_change_y.create({
        y: ctx.readInput(block.inputs.DY),
    })
);
