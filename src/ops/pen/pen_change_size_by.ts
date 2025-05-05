import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_pen_change_size } from "../../compiler/ir/pen/pen_change_size";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type pen_change_size_by = { size: CatnipInputOp };


export const op_pen_change_size_by = new class extends CatnipCommandOpType<pen_change_size_by> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: pen_change_size_by): IterableIterator<CatnipOp> {
        yield inputs.size;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: pen_change_size_by): void {
        ctx.emitInput(inputs.size, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_pen_change_size, {}, {});
    }
}


registerSB3CommandBlock("pen_changePenSizeBy", (ctx, block) => 
    op_pen_change_size_by.create({
        size: ctx.readInput(block.inputs.SIZE)
    })
);