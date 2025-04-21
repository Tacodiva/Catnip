
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_set_var } from "../../compiler/ir/data/set_var";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../runtime/CatnipVariable";
import { CatnipCommandOpType, CatnipInputOp, CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock, registerSB3InputBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_get_list_item } from "../../compiler/ir/data/get_list_item";

type get_list_item_inputs = { sprite: CatnipSpriteID, list: CatnipListID, index: CatnipInputOp };

export const op_get_list_item = new class extends CatnipInputOpType<get_list_item_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: get_list_item_inputs): IterableIterator<CatnipOp> {
        yield inputs.index;
    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_list_item_inputs): void {
        ctx.emitInput(inputs.index, CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER);

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_get_list_item, { target, list }, {});
    }
}

registerSB3InputBlock("data_itemoflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_get_list_item.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
        index: ctx.readInput(block.inputs.INDEX)
    });
});
