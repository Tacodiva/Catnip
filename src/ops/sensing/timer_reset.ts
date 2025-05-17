
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_timer_reset } from "../../compiler/ir/sensing/timer_reset";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipOp } from "../CatnipOp";


export const op_timer_reset = new class extends CatnipCommandOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_timer_reset, { }, {});
    }
}


registerSB3CommandBlock("sensing_resettimer", (ctx, block) => 
    op_timer_reset.create({})
);