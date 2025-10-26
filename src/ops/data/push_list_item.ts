
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdDataListPushItem } from "../../compiler/ir0/data/IR0CmdDataListPushItem";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type push_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp };

export const op_push_list_item = new class extends CatnipCommandOpType<push_list_item_inputs> {
    public *getInputsAndSubstacks(inputs: push_list_item_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: push_list_item_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitCommand(new IR0CmdDataListPushItem(list, target, ctx.emitInput(inputs.value)));
    }
}

registerSB3CommandBlock("data_addtolist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_push_list_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        value: ctx.readInput(block.inputs.ITEM)
    });
});
