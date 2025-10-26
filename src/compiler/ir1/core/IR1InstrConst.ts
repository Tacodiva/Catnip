import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { VALUE_STRING_MASK } from "../../../wasm-interop/CatnipWasmStructValue";
import { catnip_compiler_constant, Cast } from "../../cast";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrConst extends IR1Instruction {

    public value: catnip_compiler_constant;
    public format: CatnipValueFormat;

    public constructor(value: catnip_compiler_constant, format: CatnipValueFormat) {
        super();
        this.value = value;
        this.format = format;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.I32_HSTRING)) {
            emitter.emitWasmPushString(Cast.toString(this.value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.I32_NUMBER)) {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, Cast.toNumber(this.value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.I32_BOOLEAN)) {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, Cast.toBoolean(this.value) ? 1 : 0);
            return;
        }
        
        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            emitter.emitWasmPushNumber(SpiderNumberType.f64, Cast.toNumber(this.value));
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            const stringPtr = emitter.createCanonHString(Cast.toString(this.value));
            emitter.emitWasmPushNumber(SpiderNumberType.i64, VALUE_STRING_MASK | BigInt(stringPtr));
            emitter.emitWasm(SpiderOpcodes.f64_reinterpret_i64);
            return;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.I32_COLOR)) {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, Cast.toRGB(this.value));
            return;
        }

        throw new Error(`Unknown format for constant '${CatnipValueFormatUtils.stringify(this.format)}'`);
    }

    public stringify(ctx: IR1StringificationContext): void {
        if (this.format === null) {
            ctx.writeLine(`const ${JSON.stringify(this.value)}`);
        } else {
            ctx.writeLine(`const ${JSON.stringify(this.value)} (${CatnipValueFormatUtils.stringify(this.format)})`);
        }
    }

}
