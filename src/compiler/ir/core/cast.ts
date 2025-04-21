import { SpiderMemoryDefinition, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { VALUE_STRING_MASK, VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export type cast_ir_inputs = {
    format: CatnipValueFormat,
};

export const ir_cast = new class extends CatnipIrInputOpType<cast_ir_inputs> {

    public constructor() { super("core_cast"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipReadonlyIrInputOp<cast_ir_inputs>): CatnipCompilerValue {

        if (ir.operands[0].isConstant)
            return CatnipCompilerValue.constant(ir.operands[0].constantValue, ir.inputs.format);

        return CatnipCompilerValue.dynamic(this.cast(null, ir.operands[0].format, ir.inputs.format));
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<cast_ir_inputs>): void {
        const srcFormat = ir.operands[0].format;
        const dstFormat = ir.inputs.format;

        this.cast(ctx, srcFormat, dstFormat);
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

                            return this.cast(ctx, src & (~CatnipValueFormat.F64_NAN), dst);
                        }
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
                        // TODO We need to check if the F64 is in range.
                        ctx.emitWasm(SpiderOpcodes.i32_trunc_f64_u);
                    }

                    return CatnipValueFormat.I32_NUMBER;
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

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NUMBER_OR_NAN | CatnipValueFormat.I32_NUMBER)) {
                // Convert from an F64 that may be a boxed hstring or a number into a number

                if (ctx !== null) {

                    const value = ctx.createLocal(SpiderNumberType.f64);
                    ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                    ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                    ctx.emitWasm(SpiderOpcodes.i64_const, 32);
                    ctx.emitWasm(SpiderOpcodes.i64_shr_u);
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
                    ctx.emitWasmConst(SpiderNumberType.i32, VALUE_STRING_UPPER);
                    ctx.emitWasm(SpiderOpcodes.i32_eq);

                    // Executed if the value is a string
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    let type = this.cast(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst);
                    const trueExpr = ctx.popExpression();

                    // Executed if the value is a double already
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    type |= this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, CatnipValueFormatUtils.getFormatSpiderType(type));
                    ctx.releaseLocal(value);

                    return type;
                } else {
                    return this.cast(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst) | this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                }
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_HSTRING)) {
                if (ctx !== null) {
                    // Convert from an F64 that may be a boxed hstring or a number to an hstring
                    const value = ctx.createLocal(SpiderNumberType.i64);
                    ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                    ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                    ctx.emitWasm(SpiderOpcodes.i64_const, 32);
                    ctx.emitWasm(SpiderOpcodes.i64_shr_u);
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
                    ctx.emitWasmConst(SpiderNumberType.i32, VALUE_STRING_UPPER);
                    ctx.emitWasm(SpiderOpcodes.i32_eq);

                    // Executed if the value is a string
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);

                    // Should really be i64 -> F64_BOXED_I32_HSTRING -> CatnipValueFormat.I32_HSTRING
                    //  but we can go directly from i64 -> CatnipValueFormat.I32_HSTRING
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);

                    const trueExpr = ctx.popExpression();

                    // Executed if the value is a double already
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
                    this.cast(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_HSTRING);
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                    ctx.releaseLocal(value);
                }

                return CatnipValueFormat.I32_HSTRING;
            }

            notSupported();
        }

        if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32)) {

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_HSTRING)) {

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    // Box I32 hstring

                    if (ctx != null) {
                        ctx.emitWasm(SpiderOpcodes.i64_extend_i32_u);
                        ctx.emitWasmConst(SpiderNumberType.i64, VALUE_STRING_MASK);
                        ctx.emitWasm(SpiderOpcodes.i64_or);
                        ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
                    }
                    
                    return CatnipValueFormat.F64_BOXED_I32_HSTRING;
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
                        ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString("true"));
                        const trueExpr = ctx.popExpression();

                        ctx.pushExpression();
                        ctx.emitWasmConst(SpiderNumberType.i32, ctx.alloateHeapString("false"));
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
