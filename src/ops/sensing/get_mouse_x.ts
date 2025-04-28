
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_mouse_pos } from "../../compiler/ir/sensing/get_mouse_pos";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";


export const op_get_mouse_x = new class extends CatnipInputOpType<{}> {

    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitIr(ir_get_mouse_pos, { axis: "x" }, {});
    }
}


registerSB3InputBlock("sensing_mousex", (ctx, block) => 
    op_get_mouse_x.create({})
);