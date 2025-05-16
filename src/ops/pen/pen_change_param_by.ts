import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_pen_change_param } from "../../compiler/ir/pen/pen_change_param";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type pen_change_param_by = { param: CatnipInputOp, value: CatnipInputOp };


export const op_pen_change_param_by = new class extends CatnipCommandOpType<pen_change_param_by> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: pen_change_param_by): IterableIterator<CatnipOp> {
        yield inputs.param;
        yield inputs.value;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: pen_change_param_by): void {
        ctx.emitInput(inputs.param, CatnipValueFormat.I32_HSTRING);
        ctx.emitInput(inputs.value, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_pen_change_param, {type: "change"}, {});
    }
}


registerSB3CommandBlock("pen_changePenColorParamBy", (ctx, block) => 
    op_pen_change_param_by.create({
        param: ctx.readInput(block.inputs.COLOR_PARAM),
        value: ctx.readInput(block.inputs.VALUE)
    })
);