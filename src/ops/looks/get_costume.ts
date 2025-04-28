import { CatnipInputOpType, CatnipOp } from "../CatnipOp";
import { registerSB3InputBlock } from "../../sb3_ops";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_get_costume_number } from "../../compiler/ir/looks/get_costume_number";
import { ir_get_costume_name } from "../../compiler/ir/looks/get_costume_name";

export type get_costume_inputs = { type: "number" | "name" };

export const op_get_costume = new class extends CatnipInputOpType<get_costume_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_costume_inputs) {

        if (inputs.type === "number") {
            ctx.emitIr(ir_get_costume_number, { }, {});
        } else {
            ctx.emitIr(ir_get_costume_name, { }, {});
        }
    }
}

registerSB3InputBlock("looks_costumenumbername", (ctx, block) => op_get_costume.create({
    type: block.fields.NUMBER_NAME[0]
}));
