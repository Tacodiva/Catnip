
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_delete_list_item } from "../../compiler/ir/data/delete_list_item";

type delete_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, index: CatnipInputOp };

export const op_delete_list_item = new class extends CatnipCommandOpType<delete_list_item_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: delete_list_item_inputs): IterableIterator<CatnipOp> {
        yield inputs.index;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: delete_list_item_inputs): void {
        ctx.emitInput(inputs.index, CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_delete_list_item, { target, list }, {});
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
