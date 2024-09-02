import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipValueFormat } from "../../types";
import { VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";

export type cast_ir_inputs = {
    format: CatnipValueFormat,
    flags: CatnipValueFormat
};

export const ir_cast = new class extends CatnipIrInputOpType<cast_ir_inputs> {

    public constructor() { super("core_cast"); }

    public getOperandCount(): number { return 1; }

    public getResult(inputs: cast_ir_inputs, branches: {}, operands: ReadonlyArray<CatnipCompilerValue>): CatnipCompilerValue {
        return {
            type: CatnipCompilerValueType.DYNAMIC,
            format: inputs.format
        };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<cast_ir_inputs>): void {
        const srcFormat = ctx.stack.peek().format;
        const dstFormat = ir.inputs.format;

        this._convert(ctx, srcFormat, dstFormat);
    }

    private _convert(ctx: CatnipCompilerWasmGenContext, src: CatnipValueFormat, dst: CatnipValueFormat) {
        if ((src & dst) === src)
            return;

        function notSupported(): never {
            throw new Error(`Conversion from '${src}' -> '${dst}' not supported.`);
        }

        if ((src & CatnipValueFormat.F64) === src) {

            if ((src & CatnipValueFormat.F64_NUMBER_OR_NAN) === src) {

                if ((dst & CatnipValueFormat.F64_NUMBER) === dst) {
                    // TODO
                    // throw new Error("NaN check not implemented.");

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

                    return;
                }

                if ((dst & CatnipValueFormat.I32_HSTRING) === dst) {
                    // Convert from a number to a string
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                    return;
                }

                if ((dst & CatnipValueFormat.F64_BOXED_I32_HSTRING) === dst) {
                    this._convert(ctx, src, CatnipValueFormat.I32_HSTRING);
                    this._convert(ctx, CatnipValueFormat.I32_HSTRING, CatnipValueFormat.F64_BOXED_I32_HSTRING);
                    return;
                }

                notSupported();
            }

            if ((src & CatnipValueFormat.F64_BOXED_I32_HSTRING) === src) {

                // Unbox the pointer from the F64
                ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);

                this._convert(ctx, CatnipValueFormat.I32_HSTRING, dst);
                return;
            }

            if ((dst & CatnipValueFormat.F64_NUMBER_OR_NAN) !== 0) {
                // Convert from an F64 that may be a boxed hstring or a number into a number

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
                this._convert(ctx, CatnipValueFormat.F64_BOXED_I32_HSTRING, dst);
                const trueExpr = ctx.popExpression();
    
                // Executed if the value is a double already
                ctx.pushExpression();
                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                this._convert(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                const falseExpr = ctx.popExpression();
    
                ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.f64);
                ctx.releaseLocal(value);
                return;
            }

            if ((dst & CatnipValueFormat.I32_HSTRING) !== 0) {
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
                this._convert(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_HSTRING);
                const falseExpr = ctx.popExpression();

                ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                ctx.releaseLocal(value);
                return;
            }

            notSupported();
        }

        if ((src & CatnipValueFormat.I32) === src) {

            if ((src & CatnipValueFormat.I32_HSTRING) === src) {
                ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                this._convert(ctx, CatnipValueFormat.F64_NUMBER_OR_NAN, dst);
                return;
            }

            notSupported();
        }
    }
}
