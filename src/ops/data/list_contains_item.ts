
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_list_contains } from "../../compiler/ir/data/list_contains";

type list_contains_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, value: CatnipInputOp };

export const op_list_contains_item = new class extends CatnipInputOpType<list_contains_item_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: list_contains_item_inputs): IterableIterator<CatnipOp> {
        yield inputs.value;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: list_contains_item_inputs): void {
        ctx.emitInput(inputs.value, CatnipValueFormat.F64);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_list_contains, { target, list }, {});
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
