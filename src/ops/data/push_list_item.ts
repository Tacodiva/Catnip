
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_push_list_item } from "../../compiler/ir/data/push_list_item";

type push_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp };

export const op_push_list_item = new class extends CatnipCommandOpType<push_list_item_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: push_list_item_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: push_list_item_inputs): void {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_push_list_item, { target, list }, {});
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
