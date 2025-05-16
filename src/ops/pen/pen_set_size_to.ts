import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_pen_set_size } from "../../compiler/ir/pen/pen_set_size";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type pen_set_size_to = { size: CatnipInputOp };


export const op_pen_set_size_to = new class extends CatnipCommandOpType<pen_set_size_to> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: pen_set_size_to): IterableIterator<CatnipOp> {
        yield inputs.size;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: pen_set_size_to): void {
        ctx.emitInput(inputs.size, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_pen_set_size, {}, {});
    }
}


registerSB3CommandBlock("pen_setPenSizeTo", (ctx, block) => 
    op_pen_set_size_to.create({
        size: ctx.readInput(block.inputs.SIZE)
    })
);