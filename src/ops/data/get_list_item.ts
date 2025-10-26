
import { IR0InputDataListGetItem } from "../../compiler/ir0/data/IR0InputDataListGetItem";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

type get_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, index: CatnipInputOp };

export const op_get_list_item = new class extends CatnipInputOpType<get_list_item_inputs> {
    public *getInputsAndSubstacks(inputs: get_list_item_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.index;
    }

    public generateIr(ctx: IR0Emitter, inputs: get_list_item_inputs): IR0Input {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        return new IR0InputDataListGetItem(list, target, ctx.emitInput(inputs.index));
    }

}

registerSB3InputBlock("data_itemoflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);

    return op_get_list_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        index: ctx.readInput(block.inputs.INDEX)
    });
});
