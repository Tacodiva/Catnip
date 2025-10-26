
import { IR0CmdDataListInsertItem } from "../../compiler/ir0/data/IR0CmdDataListInsertItem";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type insert_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp, index: CatnipInputOp };

export const op_insert_list_item = new class extends CatnipCommandOpType<insert_list_item_inputs> {
    public *getInputsAndSubstacks(inputs: insert_list_item_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.index;
        yield inputs.value;
    }

    public generateIr(ctx: IR0Emitter, inputs: insert_list_item_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitCommand(new IR0CmdDataListInsertItem(list, target, ctx.emitInput(inputs.index), ctx.emitInput(inputs.value)));
    }
}

registerSB3CommandBlock("data_insertatlist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_insert_list_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        value: ctx.readInput(block.inputs.ITEM),
        index: ctx.readInput(block.inputs.INDEX),
    });
});
