
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_set_xy } from "../../compiler/ir/motion/set_xy";
import { ir_get_xy } from "../../compiler/ir/motion/get_xy";
import { ir_add } from "../../compiler/ir/operators/add";

type change_x_inputs = { x: CatnipInputOp };

export const op_change_x = new class extends CatnipCommandOpType<change_x_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: change_x_inputs): IterableIterator<CatnipOp> {
        yield inputs.x;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: change_x_inputs): void {
        ctx.emitIr(ir_get_xy, { axis: "x" }, {});
        ctx.emitInput(inputs.x, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_add, {}, {});
        ctx.emitIr(ir_get_xy, { axis: "y" }, {});
        ctx.emitIr(ir_set_xy, { }, {});
    }
}

registerSB3CommandBlock("motion_changexby", (ctx, block) =>
    op_change_x.create({
        x: ctx.readInput(block.inputs.DX),
    })
);
