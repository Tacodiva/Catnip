import { SpiderNumberType } from "wasm-spider";
import { CatnipValueFormat } from "./CatnipValueFormat";

export class CatnipValueFormatUtils {

    private constructor() { throw new Error("unreachable."); }

    static isAlways(x: CatnipValueFormat, y: CatnipValueFormat): boolean {
        return (x & y) === x;
    }

    static isSometimes(x: CatnipValueFormat, y: CatnipValueFormat): boolean {
        return (x & y) !== 0;
    }

    static getNumberFormat(number: number): CatnipValueFormat {
        if (number === Infinity) return CatnipValueFormat.F64_POS_INF;
        if (number === -Infinity) return CatnipValueFormat.F64_NEG_INF;
        if (number < 0) return Number.isInteger(number) ? CatnipValueFormat.F64_NEG_INT : CatnipValueFormat.F64_NEG_FRACT;
        if (number > 0) return Number.isInteger(number) ? CatnipValueFormat.F64_POS_INT : CatnipValueFormat.F64_POS_FRACT;
        if (Number.isNaN(number)) return CatnipValueFormat.F64_NAN;
        if (Object.is(number, -0)) return CatnipValueFormat.F64_NEG_ZERO;
        return CatnipValueFormat.F64_ZERO;
    }

    static getFormatSpiderType(inputFormat: CatnipValueFormat): SpiderNumberType {
        if (CatnipValueFormatUtils.isAlways(inputFormat, CatnipValueFormat.I32))
            return SpiderNumberType.i32;

        if (CatnipValueFormatUtils.isAlways(inputFormat, CatnipValueFormat.F64))
            return SpiderNumberType.f64;

        if (CatnipValueFormatUtils.isAlways(inputFormat, CatnipValueFormat.I64))
            return SpiderNumberType.i64;

        throw new Error(`Cannot store value of type '${inputFormat}'`)
    }
}