import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipWasmEnumValueFlags, CatnipWasmStructValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";

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
            case CatnipValueFormat.VALUE_PTR: {
                const getF64 = () => {
                    const local = ctx.createLocal(SpiderNumberType.i32);
                    ctx.emitWasm(SpiderOpcodes.local_tee, local.ref);
                    ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("flags"));
                    ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_DOUBLE);
                    ctx.emitWasm(SpiderOpcodes.i32_and);

                    // Executed if the VAL_DOUBLE flag is set
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_load, 3, CatnipWasmStructValue.getMemberOffset("val_double"));
                    const trueExpr = ctx.popExpression();

                    // Executed if the VAL_STRING flag not is set
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                    ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("val_string"));
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_parse_and_deref");
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.f64);
                    ctx.releaseLocal(local);
                }

                const getHString = () => {
                    const local = ctx.createLocal(SpiderNumberType.i32);
                    ctx.emitWasm(SpiderOpcodes.local_tee, local.ref);
                    ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("flags"));
                    ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_STRING);
                    ctx.emitWasm(SpiderOpcodes.i32_and);

                    // Executed if the VAL_STRING flag is set
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                    ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructValue.getMemberOffset("val_string"));
                    ctx.emitWasm(SpiderOpcodes.local_tee, local.ref);
                    ctx.emitWasmRuntimeFunctionCall("catnip_hstring_ref");
                    ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                    const trueExpr = ctx.popExpression();

                    // Executed if the VAL_STRING flag not is set
                    ctx.pushExpression();
                    ctx.emitWasm(SpiderOpcodes.local_get, local.ref);
                    ctx.emitWasm(SpiderOpcodes.f64_load, 3, CatnipWasmStructValue.getMemberOffset("val_double"));
                    ctx.emitWasmRuntimeFunctionCall("catnip_numconv_stringify_f64");
                    const falseExpr = ctx.popExpression();

                    ctx.emitWasm(SpiderOpcodes.if, trueExpr, falseExpr, SpiderNumberType.i32);
                    ctx.releaseLocal(local);
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
