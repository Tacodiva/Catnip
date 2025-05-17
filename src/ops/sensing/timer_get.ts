
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_mouse_pos } from "../../compiler/ir/sensing/get_mouse_pos";
import { ir_timer_get } from "../../compiler/ir/sensing/timer_get";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";


export const op_timer_get = new class extends CatnipInputOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_timer_get, { }, {});
    }
}


registerSB3InputBlock("sensing_timer", (ctx, block) => 
    op_timer_get.create({})
);