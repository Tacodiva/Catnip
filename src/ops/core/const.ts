import { catnip_compiler_constant } from "../../compiler/cast";
import { IR0Input } from "../../compiler/ir0/IR0";
import { IR0Emitter } from "../../compiler/ir0/IR0Emitter";
import { IR0InputConst } from "../../compiler/ir0/ops/log";
import { CatnipInputOpType, CatnipOp } from "../CatnipOp";

type const_inputs = { value: catnip_compiler_constant };

export const op_const = new class extends CatnipInputOpType<const_inputs> {
    public generateIr(ctx: IR0Emitter, inputs: const_inputs): IR0Input {

        // let format: CatnipValueFormat | undefined;

        // switch (typeof (inputs.value)) {
        //     case "string":
        //         format = CatnipValueFormat.F64_BOXED_I32_HSTRING;

        //         const neumericValue = Cast.toNumber(inputs.value);

        //         if (Cast.toString(neumericValue) === inputs.value)
        //             format |= CatnipValueFormatUtils.getNumberFormat(neumericValue);
        //         break;
        //     case "number":
        //         format = CatnipValueFormatUtils.getNumberFormat(inputs.value);
        //         break;
        //     case "boolean":
        //         format = CatnipValueFormat.I32_BOOLEAN;
        //         break;
        // }

        return new IR0InputConst(inputs.value);
    }
}
