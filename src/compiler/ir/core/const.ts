import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";
import { Cast, catnip_compiler_constant } from "../../cast";
import { cast_ir_inputs } from "./cast";

type const_ir_inputs = { value: catnip_compiler_constant, format?: CatnipValueFormat };

export const ir_const = new class extends CatnipIrInputOpType<const_ir_inputs> {
    public constructor() { super("core_const"); }

    public getOperandCount(): number { return 0; }

    public getResult(ir: CatnipReadonlyIrInputOp<const_ir_inputs>): CatnipCompilerValue {
        return CatnipCompilerValue.constant(ir.inputs.value, this._getFormat(ir.inputs));
    }

    private _valueToNumber(value: catnip_compiler_constant): number {
        if (value === undefined) return NaN;
        return +value;
    }

    private _isValidNumber(inputs: const_ir_inputs): boolean {
        return "" + (this._valueToNumber(inputs.value)) === inputs.value;
    }

    private _getFormat(inputs: const_ir_inputs): CatnipValueFormat {
        if (inputs.format === undefined) {
            if (this._isValidNumber(inputs))
                return CatnipValueFormatUtils.getNumberFormat(this._valueToNumber(inputs.value));

            return CatnipValueFormat.I32_HSTRING;
        } else if (inputs.format === CatnipValueFormat.F64) {
            if (this._isValidNumber(inputs))
                return CatnipValueFormatUtils.getNumberFormat(this._valueToNumber(inputs.value));

            return CatnipValueFormat.F64_BOXED_I32_HSTRING;
        } else {
            return inputs.format;
        }
    }

    public tryCast(ir: CatnipReadonlyIrOp<const_ir_inputs, {}, this>, format: CatnipValueFormat): boolean {
        /** TODO */
        (ir as any).inputs.format = format;
        return true;
    }

    public stringifyInputs(inputs: const_ir_inputs): string {
        return `${JSON.stringify(inputs.value)} ${inputs.format ? CatnipValueFormatUtils.stringify(inputs.format) : "unformatted"}`;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<const_ir_inputs>): void {
        const value = ir.inputs.value;
        const format = this._getFormat(ir.inputs);

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.I32_HSTRING)) {
            ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString(Cast.toString(value)));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            ctx.emitWasmConst(SpiderNumberType.f64, Cast.toNumber(value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            const stringPtr = ctx.alloateHeapString(Cast.toString(value));
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
