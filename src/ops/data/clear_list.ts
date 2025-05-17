
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipListID } from "../../runtime/CatnipList";
import { ir_clear_list } from "../../compiler/ir/data/clear_list";

type clear_list_inputs = { sprite: CatnipSpriteID, list: CatnipListID };

export const op_clear_list = new class extends CatnipCommandOpType<clear_list_inputs> {
    public *getInputsAndSubstacks(ir: CatnipIr, inputs: clear_list_inputs): IterableIterator<CatnipOp> {    }
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: clear_list_inputs): void {

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const list = sprite.getList(inputs.list)!;

        ctx.emitIr(ir_clear_list, { target, list }, {});
    }
}

registerSB3CommandBlock("data_deletealloflist", (ctx, block) => {
    const listInfo = ctx.getList(block.fields.LIST);
    return op_clear_list.create({
        sprite: listInfo.spriteID,
        list: listInfo.listID,
    });
});
