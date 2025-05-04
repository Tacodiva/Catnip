import { CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_xy } from "../../compiler/ir/motion/get_xy";

export const op_get_y = new class extends CatnipInputOpType<{}> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: {}) {

        ctx.emitIr(ir_get_xy, { axis: "y" }, {});
    }
}

registerSB3InputBlock("motion_yposition", (ctx, block) => op_get_y.create({}));
