import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputOperatorLetterOf extends IR0Input<["str", "idx"]> {
    public constructor(idx: IR0Input, str: IR0Input) {
        super("operator_letter_of", {
            str: {
                value: str,
                format: CatnipValueFormat.I32_HSTRING
            },
            idx: {
                value: idx,
                format: CatnipValueFormat.I32_NUMBER
            }
        });
    }

    public getResult(): CatnipValue {
        const strResult = this.args.str.getResult();
        const idxResult = this.args.idx.getResult();

        if (strResult.isConstant && idxResult.isConstant)
            return CatnipValue.constant(strResult.asConstantString().charAt(idxResult.asConstantNumber()), CatnipValueFormat.I32_HSTRING);

        return CatnipValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorLetterOf(this.args.idx.input.clone(ctx), this.args.str.input.clone(ctx));
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
            emitter.emitWasm(SpiderOpcodes.i32_sub);
            emitter.emitWasmPushRuntime();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_char_at", true);
        });
    }
}