
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0CmdLooksCostumeSet } from "../../compiler/ir0/looks/IR0CmdLooksCostumeSet";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";
import { registerSB3CommandBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipCommandOpType, CatnipInputOp } from "../CatnipOp";

type switch_to_costume = { sprite: CatnipSpriteID, costume: CatnipInputOp };

export const op_switch_to_costume = new class extends CatnipCommandOpType<switch_to_costume> {
    public *getInputsAndSubstacks(inputs: switch_to_costume): IterableIterator<CatnipInputOp | CatnipCommandList> {
        yield inputs.costume;
    }

    public generateIr(ctx: IR0Emitter, inputs: switch_to_costume): void {
        ctx.emitRequestRedraw();
        ctx.emitCommand(new IR0CmdLooksCostumeSet(ctx.emitInput(inputs.costume)));
    }
}


registerSB3CommandBlock("looks_switchcostumeto", (ctx, block) =>
    op_switch_to_costume.create({
        sprite: ctx.spriteDesc.id,
        costume: ctx.readInput(block.inputs.COSTUME)
    })
);