import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";
import { CatnipRuntimeModule } from "../../../runtime/CatnipRuntimeModule";
import { VALUE_STRING_MASK, VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";

export type cast_ir_inputs = {
    format: CatnipValueFormat,
    flags: CatnipValueFlags
};

export const ir_cast = new class extends CatnipIrInputOpType<cast_ir_inputs> {

    public constructor() { super("core_cast"); }

    public getOperandCount(): number { return 1; }

    public getResult(inputs: cast_ir_inputs, branches: {}, operands: ReadonlyArray<CatnipCompilerValue>): CatnipCompilerValue {
        return {
            type: CatnipCompilerValueType.DYNAMIC,
            format: inputs.format,
            flags: inputs.flags
        };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<cast_ir_inputs>): void {
        const srcFormat = ctx.stack.peek().format;
        const dstFormat = ir.inputs.format;

        if (srcFormat === dstFormat) return;

        function notSupported(): never {
            throw new Error(`Conversion from ${srcFormat} -> ${dstFormat} not supported.`);
        }

        switch (srcFormat) {
            case CatnipValueFormat.VALUE_BOXED: {
                const getF64 = () => {
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
                    ctx.emitWasm(SpiderOpcodes.i64_reinterpret_f64);
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                    const trueExpr = ctx.popExpression();

                    // Executed if the value is a double already
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.f64);
                    ctx.releaseLocal(value);
                }

                const getHString = () => {
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
                    ctx.emitWasm(SpiderOpcodes.i32_wrap_i64);
                    const trueExpr = ctx.popExpression();

                    // Executed if the value is a double already
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                    ctx.releaseLocal(value);
                };

                switch (dstFormat) {
                    case CatnipValueFormat.f64: {
                        // value* -> f64
                        getF64();
                        break;
                    }

                    case CatnipValueFormat.HSTRING_PTR: {
                        // value* -> hstring*
                        getHString();
                        break;
                    }
                    default: notSupported();
                }
                break;
            }
            case CatnipValueFormat.f64: {
                switch (dstFormat) {
                    case CatnipValueFormat.HSTRING_PTR: {
                        // f64 -> hstring*
                        ctx.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                        break;
                    }
                    default: notSupported();
                }
                break;
            }
            case CatnipValueFormat.HSTRING_PTR: {
                switch (dstFormat) {
                    case CatnipValueFormat.f64:
                        ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                        break;
                    case CatnipValueFormat.i32:
                        ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                        ctx.emitWasm(SpiderOpcodes.i32_trunc_sat_f64_s);
                        break;
                }
                break;
            }
            default: notSupported();
        }
    }
}
