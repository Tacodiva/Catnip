import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../../compiler/CatnipIrBranch";
import { ir_const } from "../../compiler/ir/core/const";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type const_inputs = { value: string | number };

export const op_const = new class extends CatnipInputOpType<const_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> {}

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: const_inputs) {
        ctx.emitIr<typeof ir_const>(ir_const, {
            value: "" + inputs.value,
        }, {});
    }
}
