
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { ir_request_redraw } from "../../compiler/ir/core/request_redraw";
import { ir_set_costume } from "../../compiler/ir/looks/set_costume";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandOpType, CatnipInputOp, CatnipOp } from "../CatnipOp";

type switch_to_costume = { sprite: CatnipSpriteID, costume: CatnipInputOp };

export const op_switch_to_costume = new class extends CatnipCommandOpType<switch_to_costume> {

    public *getInputsAndSubstacks(ir: CatnipIr, inputs: switch_to_costume): IterableIterator<CatnipOp> {
        yield inputs.costume;
    }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: switch_to_costume): void {
        ctx.emitInput(inputs.costume, CatnipValueFormat.F64 | CatnipValueFormat.I32_NUMBER | CatnipValueFormat.I32_HSTRING);
        ctx.emitIr(ir_request_redraw, {}, {});
        ctx.emitIr(ir_set_costume, { }, {});
    }
}


registerSB3CommandBlock("looks_switchcostumeto", (ctx, block) =>
    op_switch_to_costume.create({
        sprite: ctx.spriteDesc.id,
        costume: ctx.readInput(block.inputs.COSTUME)
    })
);