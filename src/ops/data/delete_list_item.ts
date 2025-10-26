
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdDataListDeleteItem } from "../../compiler/ir0/data/IR0CmdDataListDeleteItem";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type delete_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, index: CatnipInputOp };

export const op_delete_list_item = new class extends CatnipCommandOpType<delete_list_item_inputs> {
    public *getInputsAndSubstacks(inputs: delete_list_item_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.index;
    }

    public generateIr(ctx: IR0Emitter, inputs: delete_list_item_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitCommand(new IR0CmdDataListDeleteItem(list, target, ctx.emitInput(inputs.index)));
    }
}

registerSB3CommandBlock("data_deleteoflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_delete_list_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        index: ctx.readInput(block.inputs.INDEX),
    });
});
