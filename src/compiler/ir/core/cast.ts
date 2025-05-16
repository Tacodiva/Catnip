import { SpiderMemoryDefinition, SpiderNumberType, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { VALUE_STRING_MASK, VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipWasmStructHeapString } from "../../../wasm-interop/CatnipWasmStructHeapString";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";

export type cast_ir_inputs = {
    format: CatnipValueFormat,
};

export const ir_cast = new class extends CatnipIrInputOpType<cast_ir_inputs> {

    public constructor() { super("core_cast"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipIrInputOp<cast_ir_inputs>): CatnipCompilerValue {

        if (ir.operands[0].isConstant)
            return CatnipCompilerValue.constant(ir.operands[0].constantValue, ir.inputs.format);

        return CatnipCompilerValue.dynamic(this.cast(null, ir.operands[0].format, ir.inputs.format));
    }

    public tryCast(ir: CatnipIrOp<cast_ir_inputs, {}, this>, format: CatnipValueFormat): boolean {
        ir.inputs.format = format;

        return true;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<cast_ir_inputs>): void {
        const srcFormat = ir.operands[0].format;
        const dstFormat = ir.inputs.format;

        this.cast(ctx, srcFormat, dstFormat);
    }

    public stringifyInputs(inputs: cast_ir_inputs): string {
        return "-> " + CatnipValueFormatUtils.stringify(inputs.format);
    }

    public emitStringCheck(ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat,
        isString: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => CatnipValueFormat,
        isNumber: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => CatnipValueFormat): CatnipValueFormat;

    public emitStringCheck(ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat,
        isString: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => void,
        isNumber: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => void): void;

    public emitStringCheck(ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat,
        isString: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => CatnipValueFormat | void,
        isNumber: (ctx: CatnipCompilerWasmGenContext, format: CatnipValueFormat) => CatnipValueFormat | void): CatnipValueFormat | void {

        if (CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            // We do a block so if there is a br in the lambda, the index stays the same
            ctx.emitWasm(SpiderOpcodes.drop);
            ctx.pushExpression();
            isNumber(ctx, format);
            ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression());
            return;
        }

        if (CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            ctx.emitWasm(SpiderOpcodes.drop);
            ctx.pushExpression();
            isString(ctx, format);
            ctx.emitWasm(SpiderOpcodes.block, ctx.popExpression());
            return;
        }

        CatnipCompilerLogger.assert(CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64));

        ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
        ctx.emitWasm(SpiderOpcodes.i64_const, 32);
        ctx.emitWasm(SpiderOpcodes.i64_shr_u);
        ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
        ctx.emitWasmConst(SpiderNumberType.i32, VALUE_STRING_UPPER);
        ctx.emitWasm(SpiderOpcodes.i32_eq);

        // Executed if the value is a string
        ctx.pushExpression();

        const valueFormat0 = isString(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING);

        const trueExpr = ctx.popExpression();

        // Executed if the value is a double already
        ctx.pushExpression();

        const valueFormat1 = isNumber(ctx, format & (~CatnipValueFormat.F64_BOXED_I32_HSTRING));

        const falseExpr = ctx.popExpression();

        let outFormat: CatnipValueFormat | undefined;

        if (valueFormat0 === undefined || valueFormat1 === undefined) {
            if (valueFormat0 !== undefined || valueFormat1 !== undefined)
                throw new Error("Both branches must return a value.");

            outFormat = undefined;
        } else {
            outFormat = valueFormat0 | valueFormat1;
        }

        ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, outFormat === undefined ? undefined : CatnipValueFormatUtils.getFormatSpiderType(outFormat));
        return outFormat;
    }

    public cast(ctx: CatnipCompilerWasmGenContext | null, src: CatnipValueFormat, dst: CatnipValueFormat): CatnipValueFormat {

        if (CatnipValueFormatUtils.isAlways(src, dst))
            return src;

        function notSupported(): never {
            throw new Error(`Conversion from '${CatnipValueFormatUtils.stringify(src)}' -> '${CatnipValueFormatUtils.stringify(dst)}' not supported.`);
        }

        if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64)) {

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64_NUMBER_OR_NAN)) {

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.F64_NUMBER)) {

                    if (CatnipValueFormatUtils.isSometimes(src, CatnipValueFormat.F64_NAN) && !CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NAN)) {
                        if (ctx !== null) {
                            const local = ctx.createLocal(SpiderNumberType.f64);
                            ctx.emitWasm(SpiderOpcodes.local_tee, local.ref);
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            ctx.emitWasm(SpiderOpcodes.f64_eq);

                            ctx.pushExpression();
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            const trueExpr = ctx.popExpression();

                            ctx.pushExpression();
                            ctx.emitWasm(SpiderOpcodes.f64_const, 0);
                            const falseExpr = ctx.popExpression();

                            ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.f64);
                            ctx.releaseLocal(local);

                        }
                        return this.cast(ctx, src & (~CatnipValueFormat.F64_NAN), dst);
                    }

                    if (dst === CatnipValueFormat.F64_INT) {
                        if (ctx !== null) {
                            // https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_bi_math.c#L146
                            const local = ctx.createLocal(SpiderNumberType.f64);
                            ctx.emitWasm(SpiderOpcodes.local_tee, local.ref);

                            ctx.emitWasmConst(SpiderNumberType.f64, 0.5);
                            ctx.emitWasm(SpiderOpcodes.f64_lt);

                            ctx.pushExpression();
                            // The value is less than 0.5
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            ctx.emitWasmConst(SpiderNumberType.f64, -0.5);
                            ctx.emitWasm(SpiderOpcodes.f64_lt);
                            ctx.emitWasm(SpiderOpcodes.i32_eqz);

                            ctx.pushExpression();
                            // The value is < 0.5 and >= -0.5
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            ctx.emitWasmConst(SpiderNumberType.f64, 0);
                            ctx.emitWasm(SpiderOpcodes.f64_lt);

                            ctx.pushExpression();
                            // The value is < 0 and >= -0.5
                            ctx.emitWasmConst(SpiderNumberType.f64, -0);
                            const trueExpression2 = ctx.popExpression();

                            ctx.pushExpression();
                            // The value is >= 0 and < 0.5
                            ctx.emitWasmConst(SpiderNumberType.f64, 0);
                            const falseExpression2 = ctx.popExpression();

                            ctx.emitWasm(SpiderOpcodes.if, trueExpression2, falseExpression2, SpiderNumberType.f64);
                            const trueExpression1 = ctx.popExpression();

                            ctx.pushExpression();
                            // The value is < -0.5
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            ctx.emitWasm(SpiderOpcodes.f64_floor);
                            const falseExpression1 = ctx.popExpression();

                            ctx.emitWasm(SpiderOpcodes.if, trueExpression1, falseExpression1, SpiderNumberType.f64);
                            const trueExpression0 = ctx.popExpression();

                            ctx.pushExpression();
                            // Value is >= 0.5
                            ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                            ctx.emitWasmConst(SpiderNumberType.f64, 0.5);
                            ctx.emitWasm(SpiderOpcodes.f64_add);
                            ctx.emitWasm(SpiderOpcodes.f64_floor);
                            const falseExpression0 = ctx.popExpression();

                            ctx.emitWasm(SpiderOpcodes.if, trueExpression0, falseExpression0, SpiderNumberType.f64);
                            ctx.releaseLocal(local);
                        }

                        return CatnipValueFormat.F64_INT;
                    }

                    notSupported();
                }

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.I32_HSTRING)) {
                    // Convert from a number to a string
                    if (ctx !== null) {
                        ctx.emitWasmGetRuntime();
                        ctx.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                    }

                    return CatnipValueFormat.I32_HSTRING;
                }

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    return this.cast(ctx, this.cast(ctx, src, CatnipValueFormat.I32_HSTRING), CatnipValueFormat.F64_BOXED_I32_HSTRING);
                }


                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_NUMBER)) {
                    if (ctx !== null) {
                        this.cast(ctx, src, CatnipValueFormat.F64_INT);

                        const value = ctx.createLocal(SpiderNumberType.f64);
                        ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                        ctx.emitWasmConst(SpiderNumberType.f64, -2147483648); // Min 32-bit signed integer
                        ctx.emitWasm(SpiderOpcodes.f64_lt);

                        ctx.pushExpression();
                        ctx.emitWasmConst(SpiderNumberType.f64, -2147483648);
                        ctx.emitWasm(SpiderOpcodes.local_set, value.ref);
                        ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

                        ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                        ctx.emitWasmConst(SpiderNumberType.f64, 2147483647); // Max 32-bit signed integer
                        ctx.emitWasm(SpiderOpcodes.f64_gt);

                        ctx.pushExpression();
                        ctx.emitWasmConst(SpiderNumberType.f64, 2147483647);
                        ctx.emitWasm(SpiderOpcodes.local_set, value.ref);
                        ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

                        ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                        ctx.emitWasm(SpiderOpcodes.i32_trunc_f64_s);
                        
                        ctx.releaseLocal(value);
                    }

                    return CatnipValueFormat.I32_NUMBER;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {
                    this.cast(ctx, src, CatnipValueFormat.I32_NUMBER);
                    return CatnipValueFormat.I32_COLOR;
                }

                notSupported();
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {

                if (ctx !== null) {
                    // Unbox the pointer from the F64
                    ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
                }

                return this.cast(ctx, CatnipValueFormat.I32_HSTRING, dst);
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {

                if (ctx !== null) {

                    const value = ctx.createLocal(SpiderNumberType.f64);
                    ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                    // // We need to check if this is a strings, and try to parse it as a '#RRGGBB' if it is.
                    const format = this.emitStringCheck(ctx, src,
                        (ctx) => {
                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                            return this.cast(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, CatnipValueFormat.I32_COLOR);
                        },
                        (ctx) => {
                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                            return this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_COLOR);
                        }
                    );

                    ctx.releaseLocal(value);

                    CatnipCompilerLogger.assert(format === CatnipValueFormat.I32_COLOR);
                }

                return CatnipValueFormat.I32_COLOR;
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NUMBER_OR_NAN | CatnipValueFormat.I32_NUMBER)) {
                // Convert from an F64 that may be a boxed hstring or a number into a number

                if (ctx !== null) {

                    const value = ctx.createLocal(SpiderNumberType.f64);
                    ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                    const format = this.emitStringCheck(ctx, src,
                        (ctx) => {
                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                            return this.cast(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst);
                        },
                        (ctx) => {
                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                            return this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                        }
                    );

                    ctx.releaseLocal(value);

                    return format;
                } else {
                    return this.cast(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst) | this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                }
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_HSTRING)) {
                if (ctx !== null) {
                    // Convert from an F64 that may be a boxed hstring or a number to an hstring

                    const value = ctx.createLocal(SpiderNumberType.f64);
                    ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                    const format = this.emitStringCheck(ctx, src,
                        (ctx) => {

                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                            ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);

                            // Should really be i64 -> F64_BOXED_I32_HSTRING -> CatnipValueFormat.I32_HSTRING
                            //  but we can go directly from i64 -> CatnipValueFormat.I32_HSTRING
                            ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);

                            return CatnipValueFormat.I32_HSTRING;
                        },
                        (ctx) => {
                            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);

                            return this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_HSTRING);
                        }
                    );

                    ctx.releaseLocal(value);

                    CatnipCompilerLogger.assert(format === CatnipValueFormat.I32_HSTRING);
                }

                return CatnipValueFormat.I32_HSTRING;
            }

            notSupported();
        }

        if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32)) {

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_HSTRING)) {

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    // Box I32 hstring

                    if (ctx !== null) {
                        ctx.emitWasm(SpiderOpcodes.i64_extend_i32_u);
                        ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK);
                        ctx.emitWasm(SpiderOpcodes.i64_or);
                        ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
                    }

                    return CatnipValueFormat.F64_BOXED_I32_HSTRING;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {

                    if (ctx !== null) {
                        // If the first character of the string is '#', we will try to parse it as a color
                        const strPtr = ctx.createLocal(SpiderNumberType.i32);
                        ctx.emitWasm(SpiderOpcodes.local_tee, strPtr.ref);

                        // Get the first character of the string
                        ctx.emitWasm(SpiderOpcodes.i32_load16_u, 0, CatnipWasmStructHeapString.size);

                        ctx.emitWasmConst(SpiderNumberType.i32, "#".charCodeAt(0));
                        ctx.emitWasm(SpiderOpcodes.i32_eq);

                        ctx.pushExpression();
                        // The first character of the string is a '#'
                        ctx.emitWasm(SpiderOpcodes.local_get, strPtr.ref);
                        ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_to_argb");
                        const trueExpr = ctx.popExpression();

                        ctx.pushExpression();
                        // The first character is not a '#', we will try to parse it into a number then a color
                        ctx.emitWasm(SpiderOpcodes.local_get, strPtr.ref);
                        ctx.emitWasmGetRuntime();
                        ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse");

                        this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_COLOR);
                        const falseExpr = ctx.popExpression();

                        ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);

                        ctx.releaseLocal(strPtr);
                    }

                    return CatnipValueFormat.I32_COLOR;
                }

                if (ctx !== null) {
                    ctx.emitWasmGetRuntime();
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse");
                }
                return this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_BOOLEAN)) {
                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_HSTRING | CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    // boolean -> string

                    if (ctx !== null) {
                        ctx.pushExpression();
                        ctx.emitWasmConst(SpiderNumberType.i32, ctx.createHeapString("true"));
                        const trueExpr = ctx.popExpression();

                        ctx.pushExpression();
                        ctx.emitWasmConst(SpiderNumberType.i32, ctx.createHeapString("false"));
                        const falseExpr = ctx.popExpression();

                        ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                    }

                    return this.cast(ctx, CatnipValueFormat.I32_HSTRING, dst);
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_NUMBER)) {
                    if (ctx !== null) {
                        ctx.emitWasmConst(SpiderNumberType.i32, 0);
                        ctx.emitWasm(SpiderOpcodes.i32_ne);
                    }
                    return CatnipValueFormat.I32_NUMBER;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NUMBER)) {
                    if (ctx !== null) {
                        ctx.emitWasmConst(SpiderNumberType.i32, 0);
                        ctx.emitWasm(SpiderOpcodes.i32_ne);
                        ctx.emitWasm(SpiderOpcodes.f64_convert_i32_u);
                    }
                    return this.cast(ctx, CatnipValueFormat.F64_ZERO | CatnipValueFormat.F64_POS_INT, dst);
                }
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_NUMBER)) {
                if (ctx !== null) {
                    ctx.emitWasm(SpiderOpcodes.f64_convert_i32_s);
                }

                return this.cast(ctx, CatnipValueFormat.F64_INT, dst);
            }

            notSupported();
        }

        notSupported();
    }
}
