import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0Input } from "../../compiler/ir0/IR0Node";
import { IR0InputLooksCostumeGetName } from "../../compiler/ir0/looks/IR0InputLooksCostumeGetName";
import { IR0InputLooksCostumeGetNumber } from "../../compiler/ir0/looks/IR0InputLooksCostumeGetNumber";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCommandList, CatnipInputOp, CatnipInputOpType } from "../CatnipOp";

export type get_costume_inputs = { type: "number" | "name" };

export const op_get_costume = new class extends CatnipInputOpType<get_costume_inputs> {
    public *getInputsAndSubstacks(inputs: get_costume_inputs): IterableIterator<CatnipInputOp | CatnipCommandList> { }

    public generateIr(ctx: IR0Emitter, inputs: get_costume_inputs): IR0Input {

        if (inputs.type === "number") {
            return new IR0InputLooksCostumeGetNumber();
        } else {
            return new IR0InputLooksCostumeGetName();
        }
    }
}

registerSB3InputBlock("looks_costumenumbername", (ctx, block) => op_get_costume.create({
    type: block.fields.NUMBER_NAME[0]
}));
