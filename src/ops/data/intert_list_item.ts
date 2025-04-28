
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_insert_list_item } from "../../compiler/ir/data/insert_list_item";

type insert_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp, index: CatnipInputOp };

export const op_insert_list_item = new class extends CatnipCommandOpType<insert_list_item_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: insert_list_item_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
        yield inputs.index;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: insert_list_item_inputs): void {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64);
        ctx.emitInput(inputs.index, CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_insert_list_item, { target, list }, {});
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
