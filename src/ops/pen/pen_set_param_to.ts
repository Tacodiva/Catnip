import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_cast } from "../../compiler/ir/core/cast";
import { ir_log } from "../../compiler/ir/core/log";
import { ir_pen_change_param } from "../../compiler/ir/pen/pen_change_param";
import { ir_pen_down_up } from "../../compiler/ir/pen/pen_down_up";
import { ir_pen_set_color } from "../../compiler/ir/pen/pen_set_color";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type pen_set_param_to = { param: CatnipInputOp, value: CatnipInputOp };


export const op_pen_set_param_to = new class extends CatnipCommandOpType<pen_set_param_to> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: pen_set_param_to): IterableIterator<CatnipOp> {
        yield inputs.param;
        yield inputs.value;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: pen_set_param_to): void {
        ctx.emitInput(inputs.param, CatnipValueFormat.I32_HSTRING);
        ctx.emitInput(inputs.value, CatnipValueFormat.F64_NUMBER);
        ctx.emitIr(ir_pen_change_param, {type: "set"}, {});
    }
}


registerSB3CommandBlock("pen_setPenColorParamTo", (ctx, block) => 
    op_pen_set_param_to.create({
        param: ctx.readInput(block.inputs.COLOR_PARAM),
        value: ctx.readInput(block.inputs.VALUE)
    })
);