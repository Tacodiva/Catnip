
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdDataListClear } from "../../compiler/ir0/data/IR0CmdDataListClear";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type clear_list_inputs = { sprite: CatnipSpriteID, list: CatnipListID };

export const op_clear_list = new class extends CatnipCommandOpType<clear_list_inputs> {
    public *getInputsAndSubstacks(inputs: clear_list_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> {}

    public generateIr(ctx: IR0Emitter, inputs: clear_list_inputs): void {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitCommand(new IR0CmdDataListClear(list, target));
    }
}

registerSB3CommandBlock("data_deletealloflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_clear_list.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
    });
});
