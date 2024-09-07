import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { ir_const } from "../../compiler/ir/core/const";
import { CatnipInputOpType } from "../CatnipOp";

type const_inputs = { value: string | number };

export const op_const = new class extends CatnipInputOpType<const_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: const_inputs) {
        ctx.emitIr<typeof ir_const>(ir_const, {
            value: "" + inputs.value,
        }, {});
    }
}
