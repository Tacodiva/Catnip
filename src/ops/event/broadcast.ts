import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_broadcast } from "../../compiler/ir/event/broadcast";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type broadcast_inputs = { broadcastName: CatnipInputOp };

export const op_event_broadcast = new class extends CatnipCommandOpType<broadcast_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: broadcast_inputs): IterableIterator<CatnipOp | CatnipCommandList> {
        yield inputs.broadcastName;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: broadcast_inputs) {
        ctx.emitInput(inputs.broadcastName, CatnipValueFormat.I32_HSTRING);
        ctx.emitIr(ir_broadcast, { threadListVariable: null }, {});
    }
}

registerSB3CommandBlock("event_broadcast", (ctx, block) => op_event_broadcast.create({
    broadcastName: ctx.readInput(block.inputs.BROADCAST_INPUT)
}));