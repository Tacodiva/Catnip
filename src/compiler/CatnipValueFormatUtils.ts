import { SpiderNumberType } from "wasm-spider";
import { CatnipValueFormat } from "./CatnipValueFormat";

export class CatnipValueFormatUtils {

    private constructor() { throw new Error("unreachable."); }

    public static stringify(format: CatnipValueFormat): string {
        let formatFlags: CatnipValueFormat[] = [];

        for (const enumValue in CatnipValueFormat) {
            const testFormat = Number(enumValue);

            if (isNaN(testFormat))
                continue;

            if (this.isAlways(testFormat, format)) {
                for (const existingFormat of formatFlags) {
                    if (this.isAlways(testFormat, existingFormat))
                        continue;
                }

                formatFlags = formatFlags.filter(value => !this.isAlways(value, testFormat));
                formatFlags.push(testFormat);
            }
        }

        let str: string | null = null;

        for (const formatFlag of formatFlags) {
            if (str !== null) {
                str = `${str} | ${CatnipValueFormat[formatFlag]}`;
            } else {
                str = CatnipValueFormat[formatFlag];
            }
        }

        if (str === null)
            return "INVALID";

        return str;
    }

    public static isAlways(x: CatnipValueFormat, y: CatnipValueFormat): boolean {
        return (x & y) === x;
    }

    public static isSometimes(x: CatnipValueFormat, y: CatnipValueFormat): boolean {
        return (x & y) !== 0;
    }

    public static getNumberFormat(number: number): CatnipValueFormat {
        if (number === Infinity) return CatnipValueFormat.F64_POS_INF;
        if (number === -Infinity) return CatnipValueFormat.F64_NEG_INF;
        if (number < 0) return Number.isInteger(number) ? CatnipValueFormat.F64_NEG_INT : CatnipValueFormat.F64_NEG_FRACT;
        if (number > 0) return Number.isInteger(number) ? CatnipValueFormat.F64_POS_INT : CatnipValueFormat.F64_POS_FRACT;
        if (Number.isNaN(number)) return CatnipValueFormat.F64_NAN;
        if (Object.is(number, -0)) return CatnipValueFormat.F64_NEG_ZERO;
        return CatnipValueFormat.F64_ZERO;
    }

    public static getFormatSpiderType(inputFormat: CatnipValueFormat): SpiderNumberType {
        if (CatnipValueFormatUtils.isAlways(inputFormat, CatnipValueFormat.I32))
            return SpiderNumberType.i32;

        if (CatnipValueFormatUtils.isAlways(inputFormat, CatnipValueFormat.F64))
            return SpiderNumberType.f64;

        throw new Error(`Cannot store value of type '${inputFormat}'`)
    }
}