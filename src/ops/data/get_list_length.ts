import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_list_length } from "../../compiler/ir/data/get_list_length";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type get_list_length_inputs = { sprite: CatnipSpriteID, list: CatnipListID };

export const op_get_list_length = new class extends CatnipInputOpType<get_list_length_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_list_length_inputs) {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_get_list_length, { target, list }, {});
    }
}

registerSB3InputBlock("data_lengthoflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_get_list_length.create({ sprite: listInfo.spriteID, list: listInfo.listID });
});
