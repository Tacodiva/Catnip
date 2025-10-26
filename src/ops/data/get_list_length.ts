import { IR0InputDataListGetLength } from "../../compiler/ir0/data/IR0InputDataListGetLength";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { CatnipListID } from "../../runtime/CatnipList";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

type get_list_length_inputs = { sprite: CatnipSpriteID, list: CatnipListID };

export const op_get_list_length = new class extends CatnipInputOpType<get_list_length_inputs> {
    public *getInputsAndSubstacks(inputs: get_list_length_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> { }

    public generateIr(ctx: IR0Emitter, inputs: get_list_length_inputs): IR0Input {
        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        return new IR0InputDataListGetLength(list, target);
    }

}

registerSB3InputBlock("data_lengthoflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_get_list_length.create({ sprite: listInfo.spriteID, list: listInfo.listID });
});
