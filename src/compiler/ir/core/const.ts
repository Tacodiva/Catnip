import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";
import { Cast, catnip_compiler_constant } from "../../cast";
import { convert_ir_inputs } from "./convert";

type const_ir_inputs = { value: catnip_compiler_constant, format?: CatnipValueFormat };

export const ir_const = new class extends CatnipIrInputOpType<const_ir_inputs> {
    public constructor() { super("core_const"); }

    public getOperandCount(): number { return 0; }

    public getResult(ir: CatnipIrInputOp<const_ir_inputs>): CatnipCompilerValue {
        return CatnipCompilerValue.constant(ir.inputs.value, this._getFormat(ir.inputs));
    }

    private _isValidNumber(inputs: const_ir_inputs): boolean {
        return Cast.toString(Cast.toNumber(inputs.value)) === inputs.value;
    }

    private _getFormat(inputs: const_ir_inputs): CatnipValueFormat {
        if (inputs.format === undefined) {
            if (this._isValidNumber(inputs))
                return CatnipValueFormatUtils.getNumberFormat(Cast.toNumber(inputs.value));

            return CatnipValueFormat.I32_HSTRING;
        } else if (CatnipValueFormatUtils.isSometimes(inputs.format, CatnipValueFormat.F64_NUMBER_OR_NAN) && CatnipValueFormatUtils.isSometimes(inputs.format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            if (this._isValidNumber(inputs))
                return CatnipValueFormatUtils.getNumberFormat(Cast.toNumber(inputs.value));

            return CatnipValueFormat.F64_BOXED_I32_HSTRING;
        } else {
            return inputs.format;
        }
    }

    public tryConvert(ir: CatnipIrOp<const_ir_inputs, {}, this>, format: CatnipValueFormat): boolean {

        if (ir.inputs.format !== undefined &&
            CatnipValueFormatUtils.isSometimes(ir.inputs.format, format)
        ) {
            ir.inputs.format &= format;
        } else {
            ir.inputs.format = format;
        }

        return true;
    }

    public stringifyInputs(inputs: const_ir_inputs): string {
        return `${JSON.stringify(inputs.value)} ${inputs.format ? "format" : "no format"} ${CatnipValueFormatUtils.stringify(this._getFormat(inputs))}`;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<const_ir_inputs>): void {
        const value = ir.inputs.value;
        const format = this._getFormat(ir.inputs);

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_HSTRING)) {
            ctx.emitWasmConst(SpiderNumberType.i32, ctx.createHeapString(Cast.toString(value)));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            ctx.emitWasmConst(SpiderNumberType.f64, Cast.toNumber(value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            const stringPtr = ctx.createHeapString(Cast.toString(value));
            ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(stringPtr));
            ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_NUMBER)) {
            ctx.emitWasmConst(SpiderNumberType.i32, Cast.toNumber(value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_BOOLEAN)) {
            ctx.emitWasmConst(SpiderNumberType.i32, Cast.toBoolean(value) ? 1 : 0);
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_COLOR)) {
            ctx.emitWasmConst(SpiderNumberType.i32, Cast.toRGB(value));
            return;
        }

        throw new Error(`Unknown format for constant '${format}'`);
    }
}
