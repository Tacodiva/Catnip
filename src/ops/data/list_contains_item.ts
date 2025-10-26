
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputDataListContains } from "../../compiler/ir0/data/IR0InputDataListContains";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

type list_contains_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp };

export const op_list_contains_item = new class extends CatnipInputOpType<list_contains_item_inputs> {
    public *getInputsAndSubstacks(inputs: list_contains_item_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: list_contains_item_inputs): IR0Input {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;
        return new IR0InputDataListContains(list, target, ctx.emitInput(inputs.value));
    }
}

registerSB3InputBlock("data_listcontainsitem", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);

    return op_list_contains_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        value: ctx.readInput(block.inputs.ITEM)
    });
});
