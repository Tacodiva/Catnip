import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { ir_is_key_down } from "../../compiler/ir/sensing/is_key_down";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";

type is_key_down_inputs = { key: CatnipInputOp }

export const op_is_key_down = new class extends CatnipInputOpType<is_key_down_inputs> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: is_key_down_inputs): IterableIterator<CatnipOp> {
        yield inputs.key;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: is_key_down_inputs): void {
        ctx.emitInput(inputs.key);
        ctx.emitIr(ir_is_key_down, {}, {});
    }
}


registerSB3InputBlock("sensing_keypressed", (ctx, block) => 
    op_is_key_down.create({
        key: ctx.readInput(block.inputs.KEY_OPTION)
    })
);