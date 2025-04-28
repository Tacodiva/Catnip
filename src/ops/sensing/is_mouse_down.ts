import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_is_mouse_down } from "../../compiler/ir/sensing/is_mouse_down";
import { registerSB3InputBlock } from "../../sb3_ops";

export const op_is_mouse_down = new class extends CatnipInputOpType<{}> {

    public *getInputsAndSubstacks(ir: CatnipIr): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_is_mouse_down, {}, {});
    }
}


registerSB3InputBlock("sensing_mousedown", (ctx, block) =>
    op_is_mouse_down.create({})
);