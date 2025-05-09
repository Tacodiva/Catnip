import { Cast } from "../../compiler/cast";
import { CatnipCompilerIrGenContext } from "../../compiler/CatnipCompilerIrGenContext";
import { CatnipValueFormat } from "../../compiler/CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../compiler/CatnipValueFormatUtils";
import { ir_const } from "../../compiler/ir/core/const";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type const_inputs = { value: string | number | boolean | undefined };

export const op_const = new class extends CatnipInputOpType<const_inputs> {
    public *getInputsAndSubstacks(): IterableIterator<CatnipOp> { }

    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: const_inputs) {

        let format: CatnipValueFormat | undefined;

        switch (typeof (inputs.value)) {
            case "string":
                format = CatnipValueFormat.F64_BOXED_I32_HSTRING;

                const neumericValue = Cast.toNumber(inputs.value);

                if (Cast.toString(neumericValue) === inputs.value)
                    format |= CatnipValueFormatUtils.getNumberFormat(neumericValue);
                break;
            case "number":
                format = CatnipValueFormatUtils.getNumberFormat(inputs.value);
                break;
            case "boolean":
                format = CatnipValueFormat.I32_BOOLEAN;
                break;
        }

        ctx.emitIrConst(inputs.value, format);
    }
}
