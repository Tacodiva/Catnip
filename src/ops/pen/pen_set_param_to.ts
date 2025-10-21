import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdPenChangeProperty } from "../../compiler/ir0/pen/IR0CmdPenChangeProperty";
import { IR1PenParameterChangeType } from "../../compiler/ir1/pen/IR1InstrPenChangeParam";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type pen_set_param_to = { param: CatnipInputOp, value: CatnipInputOp };

export const op_pen_set_param_to = new class extends CatnipCommandOpType<pen_set_param_to> {
    public *getInputsAndSubstacks(inputs: pen_set_param_to): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.param;
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: pen_set_param_to): void {
        ctx.emitCommand(new IR0CmdPenChangeProperty(
            IR1PenParameterChangeType.SET,
            ctx.emitInput(inputs.param),
            ctx.emitInput(inputs.value)
        ));
    }
}

registerSB3CommandBlock("pen_setPenColorParamTo", (ctx, block) =>
    op_pen_set_param_to.create({
        param: ctx.readInput(block.inputs.COLOR_PARAM),
        value: ctx.readInput(block.inputs.VALUE)
    })
);