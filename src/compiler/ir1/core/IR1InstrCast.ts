import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructHeapString } from "../../../wasm-interop/CatnipWasmStructHeapString";
import { VALUE_CANNON_NAN_UPPER, VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1Logger } from "../IR1Logger";
import { IR1StringificationContext } from "../IR1StringificationContext";

interface CastContext {
    didGC: boolean;
}

export class IR1InstrCast extends IR1Instruction {

    public src: CatnipValueFormat;
    public dst: CatnipValueFormat;

    public constructor(src: CatnipValueFormat, dst: CatnipValueFormat) {
        super();
        this.src = src;
        this.dst = dst;
    }

    public static emitStringCheck(emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat,
        isString: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => CatnipValueFormat,
        isNumber: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => CatnipValueFormat): CatnipValueFormat;

    public static emitStringCheck(emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat,
        isString: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => void,
        isNumber: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => void): void;

    public static emitStringCheck(emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat,
        isString: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => CatnipValueFormat | void,
        isNumber: (emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat, depth: number) => CatnipValueFormat | void): CatnipValueFormat | void {

        if (CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            emitter.emitWasm(SpiderOpcodes.drop);
            return isNumber(emitter, format, 0);
        }

        if (CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            emitter.emitWasm(SpiderOpcodes.drop);
            return isString(emitter, format, 0);
        }

        IR1Logger.assert(CatnipValueFormatUtils.isAlways(format, CatnipValueFormat.F64));

        let stringFormat: CatnipValueFormat | void = undefined, numberFormat: CatnipValueFormat | void = undefined;
        const stringExpr = emitter.emitExpression((emitter) => stringFormat = isString(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, 2));
        const numberExpr = emitter.emitExpression((emitter) => numberFormat = isNumber(emitter, format & (~CatnipValueFormat.F64_BOXED_I32_HSTRING), 1));

        let outFormat: CatnipValueFormat | undefined;
        if (stringFormat === undefined || numberFormat === undefined) {
            if (stringFormat !== undefined || numberFormat !== undefined)
                throw new Error("Both branches must return a value.");

            outFormat = undefined;
        } else {
            outFormat = stringFormat | numberFormat;
        }

        const valueLocal = emitter.borrowLocal(format);
        emitter.emitWasm(SpiderOpcodes.local_set, valueLocal);

        emitter.emitWasmBlock(emitter => {

            emitter.emitWasmBlock(emitter => {
                emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                emitter.emitWasm(SpiderOpcodes.f64_eq);

                // If the values equal eachother, it's a number
                emitter.emitWasm(SpiderOpcodes.br_if, 0);

                // Otherwise, the value is NaN, we need to check if it's a canonical NaN or not
                emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                emitter.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                emitter.emitWasm(SpiderOpcodes.i64_const, 32);
                emitter.emitWasm(SpiderOpcodes.i64_shr_u);
                emitter.emitWasm(SpiderOpcodes.i32_wrap_i64);
                emitter.emitWasmPushNumber(SpiderNumberType.i32, VALUE_CANNON_NAN_UPPER);
                emitter.emitWasm(SpiderOpcodes.i32_eq);

                // If it a canonical NaN, it's a number
                emitter.emitWasm(SpiderOpcodes.br_if, 0);

                // Otherwise, it's a string!
                emitter.emitWasmExpression(stringExpr);
                emitter.emitWasm(SpiderOpcodes.br, 1);
            });

            emitter.emitWasmExpression(numberExpr);

        },
            outFormat === undefined ? undefined : CatnipValueFormatUtils.getFormatSpiderType(outFormat)
        );

        emitter.returnLocal(valueLocal);

        return outFormat;

        // emitter.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
        // emitter.emitWasm(SpiderOpcodes.i64_const, 32);
        // emitter.emitWasm(SpiderOpcodes.i64_shr_u);
        // emitter.emitWasm(SpiderOpcodes.i32_wrap_i64);
        // emitter.emitWasmPushNumber(SpiderNumberType.i32, VALUE_STRING_UPPER);
        // emitter.emitWasm(SpiderOpcodes.i32_eq);

        // emitter.emitWasm(SpiderOpcodes.if,
        //     stringExpr, numberExpr,
        //     outFormat === undefined ? undefined : CatnipValueFormatUtils.getFormatSpiderType(outFormat)
        // );
        // return outFormat;
    }

    public static emitConversion(emitter: CatnipCompilerWasmEmitter | null, src: CatnipValueFormat, dst: CatnipValueFormat, ctx?: CastContext): CatnipValueFormat {

        if (CatnipValueFormatUtils.isAlways(src, dst))
            return src;

        function notSupported(): never {
            throw new Error(`Conversion from '${CatnipValueFormatUtils.stringify(src)}' -> '${CatnipValueFormatUtils.stringify(dst)}' not supported.`);
        }

        if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64)) {

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64_NUMBER_OR_NAN)) {

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.F64_NUMBER)) {

                    if (CatnipValueFormatUtils.isSometimes(src, CatnipValueFormat.F64_NAN) && !CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NAN)) {
                        if (emitter !== null) {
                            const local = emitter.borrowLocal(src);
                            emitter.emitWasm(SpiderOpcodes.local_tee, local);
                            emitter.emitWasm(SpiderOpcodes.f64_const, 0);
                            emitter.emitWasm(SpiderOpcodes.local_get, local);
                            emitter.emitWasm(SpiderOpcodes.local_get, local);
                            emitter.emitWasm(SpiderOpcodes.f64_eq);
                            emitter.emitWasm(SpiderOpcodes.select);
                            emitter.returnLocal(local);
                        }
                        return this.emitConversion(emitter, src & (~CatnipValueFormat.F64_NAN), dst);
                    }

                    if (dst === CatnipValueFormat.F64_INT) {
                        if (emitter !== null) {
                            // https://github.com/svaarala/duktape/blob/50af773b1b32067170786c2b7c661705ec7425d4/src-input/duk_bi_math.c#L146
                            const local = emitter.borrowLocal(src);
                            emitter.emitWasm(SpiderOpcodes.local_tee, local);

                            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0.5);
                            emitter.emitWasm(SpiderOpcodes.f64_lt);

                            emitter.emitWasmIf(
                                emitter => {
                                    // The value is < 0.5
                                    emitter.emitWasm(SpiderOpcodes.local_get, local);
                                    emitter.emitWasmPushNumber(SpiderNumberType.f64, -0.5);
                                    emitter.emitWasm(SpiderOpcodes.f64_lt);
                                    emitter.emitWasm(SpiderOpcodes.i32_eqz);

                                    emitter.emitWasmIf(
                                        (emitter) => {
                                            // The value is < 0.5 and >= -0.5
                                            emitter.emitWasm(SpiderOpcodes.local_get, local);
                                            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
                                            emitter.emitWasm(SpiderOpcodes.f64_lt);
                                            emitter.emitWasmIf(
                                                (emitter) => {
                                                    // The value is < 0 and >= -0.5
                                                    emitter.emitWasmPushNumber(SpiderNumberType.f64, -0);
                                                },
                                                (emitter) => {
                                                    // The value is >= 0 and < 0.5
                                                    emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
                                                },
                                                SpiderNumberType.f64
                                            );
                                        },
                                        (emitter) => {
                                            // The value is < -0.5
                                            emitter.emitWasm(SpiderOpcodes.local_get, local);
                                            emitter.emitWasm(SpiderOpcodes.f64_floor);
                                        },
                                        SpiderNumberType.f64
                                    );
                                },
                                emitter => {
                                    // Value is >= 0.5
                                    emitter.emitWasm(SpiderOpcodes.local_get, local);
                                    emitter.emitWasmPushNumber(SpiderNumberType.f64, 0.5);
                                    emitter.emitWasm(SpiderOpcodes.f64_add);
                                    emitter.emitWasm(SpiderOpcodes.f64_floor);
                                },
                                SpiderNumberType.f64
                            );
                            emitter.returnLocal(local);
                        }

                        return CatnipValueFormat.F64_INT;
                    }

                    notSupported();
                }

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.I32_HSTRING)) {
                    // Convert from a number to a string
                    if (emitter !== null) {
                        emitter.emitWasmPushRuntime();
                        emitter.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64_gc");
                    }

                    if (ctx) ctx.didGC = true;

                    return CatnipValueFormat.I32_HSTRING;
                }

                if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    return this.emitConversion(emitter, this.emitConversion(emitter, src, CatnipValueFormat.I32_HSTRING), CatnipValueFormat.F64_BOXED_I32_HSTRING);
                }


                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_NUMBER)) {
                    if (emitter !== null) {
                        this.emitConversion(emitter, src, CatnipValueFormat.F64_INT);
                        emitter.emitWasm(SpiderOpcodes.i32_trunc_sat_f64_s);
                    }

                    return CatnipValueFormat.I32_NUMBER;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {
                    this.emitConversion(emitter, src, CatnipValueFormat.I32_NUMBER);
                    return CatnipValueFormat.I32_COLOR;
                }

                notSupported();
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {

                if (emitter !== null) {
                    // Unbox the pointer from the F64
                    emitter.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                    emitter.emitWasm(SpiderOpcodes.i32_wrap_i64);
                }

                return this.emitConversion(emitter, CatnipValueFormat.I32_HSTRING, dst);
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {

                if (emitter !== null) {

                    const value = emitter.borrowLocal(src);
                    emitter.emitWasm(SpiderOpcodes.local_tee, value);

                    // We need to check if this is a strings, and try to parse it as a '#RRGGBB' if it is.
                    const format = this.emitStringCheck(emitter, src,
                        (emitter) => {
                            emitter.emitWasm(SpiderOpcodes.local_get, value);
                            return this.emitConversion(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, CatnipValueFormat.I32_COLOR);
                        },
                        (emitter) => {
                            emitter.emitWasm(SpiderOpcodes.local_get, value);
                            return this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_COLOR);
                        }
                    );

                    emitter.returnLocal(value);

                    CatnipCompilerLogger.assert(format === CatnipValueFormat.I32_COLOR);
                }

                return CatnipValueFormat.I32_COLOR;
            }

            if (CatnipValueFormatUtils.isAlways(dst, CatnipValueFormat.F64_NUMBER)) {
                // Faster conversion for F64 -> F64_NUMBER

                if (emitter !== null) {

                    const valueLocal = emitter.borrowLocal(CatnipValueFormat.F64);
                    emitter.emitWasm(SpiderOpcodes.local_set, valueLocal);

                    emitter.emitWasmBlock(emitter => {
                        emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                        emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                        emitter.emitWasm(SpiderOpcodes.f64_eq);

                        // If the values equal eachother, it's a number
                        emitter.emitWasmIf(emitter => {
                            emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                            emitter.emitWasm(SpiderOpcodes.br, 1);
                        });

                        // Otherwise, the value is NaN, we need to check if it's a canonical NaN or not
                        emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                        emitter.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                        emitter.emitWasm(SpiderOpcodes.i64_const, 32);
                        emitter.emitWasm(SpiderOpcodes.i64_shr_u);
                        emitter.emitWasm(SpiderOpcodes.i32_wrap_i64);
                        emitter.emitWasmPushNumber(SpiderNumberType.i32, VALUE_CANNON_NAN_UPPER);
                        emitter.emitWasm(SpiderOpcodes.i32_eq);

                        // If it a canonical NaN, return 0
                        emitter.emitWasmIf(emitter => {
                            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
                            emitter.emitWasm(SpiderOpcodes.br, 1);
                        });

                        // Otherwise, it's a string!
                        emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
                        this.emitConversion(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, CatnipValueFormat.F64_NUMBER, ctx);

                    }, SpiderNumberType.f64);

                    emitter.returnLocal(valueLocal);
                }

                return this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER, dst, ctx);
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NUMBER_OR_NAN | CatnipValueFormat.I32_NUMBER)) {
                // Convert from an F64 that may be a boxed hstring or a number into a number

                if (emitter !== null) {

                    const value = emitter.borrowLocal(src);
                    emitter.emitWasm(SpiderOpcodes.local_tee, value);

                    const format = this.emitStringCheck(emitter, src,
                        (emitter) => {
                            emitter.emitWasm(SpiderOpcodes.local_get, value);
                            return this.emitConversion(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst, ctx);
                        },
                        (emitter) => {
                            emitter.emitWasm(SpiderOpcodes.local_get, value);
                            return this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, dst, ctx);
                        }
                    );

                    emitter.returnLocal(value);

                    return format;
                } else {
                    return this.emitConversion(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst, ctx) | this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, dst, ctx);
                }
            }

            if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_HSTRING)) {
                if (emitter !== null) {
                    // Convert from an F64 that may be a boxed hstring or a number to an hstring

                    const value = emitter.borrowLocal(src);
                    emitter.emitWasm(SpiderOpcodes.local_tee, value);

                    const format = this.emitStringCheck(emitter, src,
                        (emitter) => {

                            emitter.emitWasm(SpiderOpcodes.local_get, value);
                            emitter.emitWasm(SpiderOpcodes.i64_reinterpret_f64);

                            // Should really be i64 -> F64_BOXED_I32_HSTRING -> CatnipValueFormat.I32_HSTRING
                            //  but we can go directly from i64 -> CatnipValueFormat.I32_HSTRING
                            emitter.emitWasm(SpiderOpcodes.i32_wrap_i64);

                            return CatnipValueFormat.I32_HSTRING;
                        },
                        (emitter) => {
                            emitter.emitWasm(SpiderOpcodes.local_get, value);

                            return this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_HSTRING, ctx);
                        }
                    );

                    emitter.returnLocal(value);

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

                    if (emitter !== null) {
                        emitter.emitWasm(SpiderOpcodes.i64_extend_i32_u);
                        emitter.emitWasmPushNumber(SpiderNumberType.i64, VALUE_STRING_MASK);
                        emitter.emitWasm(SpiderOpcodes.i64_or);
                        emitter.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
                    }

                    return CatnipValueFormat.F64_BOXED_I32_HSTRING;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_COLOR)) {

                    if (emitter !== null) {
                        // If the first character of the string is '#', we will try to parse it as a color
                        const strPtr = emitter.borrowLocal(src);
                        emitter.emitWasm(SpiderOpcodes.local_tee, strPtr);

                        // Get the first character of the string
                        emitter.emitWasm(SpiderOpcodes.i32_load16_u, 0, CatnipWasmStructHeapString.size);

                        emitter.emitWasmPushNumber(SpiderNumberType.i32, "#".charCodeAt(0));
                        emitter.emitWasm(SpiderOpcodes.i32_eq);

                        emitter.emitWasmIf(
                            emitter => {
                                // The first character of the string is a '#'
                                emitter.emitWasm(SpiderOpcodes.local_get, strPtr);
                                emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_to_argb");
                            },
                            emitter => {
                                // The first character is not a '#', we will try to parse it into a number then a color
                                emitter.emitWasm(SpiderOpcodes.local_get, strPtr);
                                emitter.emitWasmRuntimeFunctionCall("catnip_numconv_parse");

                                this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_COLOR, ctx);
                            },
                            SpiderNumberType.i32
                        );

                        emitter.returnLocal(strPtr);
                    }

                    return CatnipValueFormat.I32_COLOR;
                }

                if (emitter !== null) {
                    emitter.emitWasmRuntimeFunctionCall("catnip_numconv_parse");
                }
                return this.emitConversion(emitter, CatnipValueFormat.F64_NUMBER_OR_NAN, dst, ctx);
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_BOOLEAN)) {
                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_HSTRING | CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
                    // boolean -> string

                    if (emitter !== null) {
                        emitter.emitWasmIf(
                            emitter => emitter.emitWasmPushString("true"),
                            emitter => emitter.emitWasmPushString("false"),
                            SpiderNumberType.i32
                        );
                    }

                    return this.emitConversion(emitter, CatnipValueFormat.I32_HSTRING, dst, ctx);
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_NUMBER)) {
                    if (emitter !== null) {
                        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
                        emitter.emitWasm(SpiderOpcodes.i32_ne);
                    }
                    return CatnipValueFormat.I32_NUMBER;
                }

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.F64_NUMBER)) {
                    if (emitter !== null) {
                        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
                        emitter.emitWasm(SpiderOpcodes.i32_ne);
                        emitter.emitWasm(SpiderOpcodes.f64_convert_i32_u);
                    }
                    return this.emitConversion(emitter, CatnipValueFormat.F64_ZERO | CatnipValueFormat.F64_POS_INT, dst, ctx);
                }
            }

            if (CatnipValueFormatUtils.isAlways(src, CatnipValueFormat.I32_NUMBER)) {

                if (CatnipValueFormatUtils.isSometimes(dst, CatnipValueFormat.I32_BOOLEAN)) {
                    if (emitter !== null) {
                        emitter.emitWasm(SpiderOpcodes.i32_eqz);
                        emitter.emitWasm(SpiderOpcodes.i32_eqz);
                    }

                    return CatnipValueFormat.I32_BOOLEAN;
                }

                if (emitter !== null) {
                    emitter.emitWasm(SpiderOpcodes.f64_convert_i32_s);
                }

                return this.emitConversion(emitter, CatnipValueFormat.F64_INT, dst, ctx);
            }

            notSupported();
        }

        notSupported();
    }

    public canTriggerGC(): boolean {
        const ctx: CastContext = { didGC: false };
        IR1InstrCast.emitConversion(null, this.src, this.dst, ctx);
        return ctx.didGC;
    }

    public getResultFormat(): CatnipValueFormat {
        return IR1InstrCast.emitConversion(null, this.src, this.dst);
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        IR1InstrCast.emitConversion(emitter, this.src, this.dst);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`cast ${CatnipValueFormatUtils.stringify(this.src)} -> ${CatnipValueFormatUtils.stringify(this.dst)}`);
    }
}
