import { Cast, catnip_compiler_constant } from "./cast";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipValueFormatUtils } from "./CatnipValueFormatUtils";

export class CatnipValue {
    public static none(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.NONE);
    }

    public static constantF64(value: number): CatnipValue {
        return new CatnipValue(CatnipValueFormatUtils.getNumberFormat(value), value);
    }

    public static constant(value: catnip_compiler_constant, format: CatnipValueFormat): CatnipValue {
        return new CatnipValue(format, value);
    }

    public static dynamic(format: CatnipValueFormat): CatnipValue {
        return new CatnipValue(format, null);
    }

    public readonly format: CatnipValueFormat;

    private readonly _constantValue: catnip_compiler_constant | null;

    public get constantValue(): catnip_compiler_constant {
        if (this._constantValue === null)
            throw new Error("Value is not constant.");
        return this._constantValue;
    }

    public get isNone() {
        return this.format === CatnipValueFormat.NONE;
    }

    public get isConstant() {
        return this._constantValue !== null;
    }

    public get isDynamic() {
        return !this.isConstant;
    }

    private constructor(format: CatnipValueFormat, constantValue: catnip_compiler_constant | null) {
        this.format = format;
        this._constantValue = constantValue;
    }

    public asConstantNumber(): number {
        return Cast.toNumber(this.constantValue);
    }

    public asConstantBoolean(): boolean {
        return Cast.toBoolean(this.constantValue);
    }

    public asConstantString(): string {
        return Cast.toString(this.constantValue);
    }

    public castTo(format: CatnipValueFormat): CatnipValue {
        return new CatnipValue(format, this._constantValue);
    }

    public isAlwaysFormat(format: CatnipValueFormat): boolean {
        return CatnipValueFormatUtils.isAlways(this.format, format);
    }

    public isSometimesFormat(format: CatnipValueFormat): boolean {
        return CatnipValueFormatUtils.isSometimes(this.format, format);
    }

    public or(other: CatnipValue): CatnipValue {
        if (this.isConstant && other.isConstant) { // TODO Check format and value?
            if (this._constantValue === other._constantValue)
                return this;
        }

        if (other.isNone) return this;
        if (this.isNone) return other;

        return new CatnipValue(this.format | other.format, null);
    }

    public equals(other: CatnipValue): boolean {
        if (this.format !== other.format)
            return false;

        if (this.isConstant && other.isConstant)
            return this._constantValue === other._constantValue;

        return this.isConstant === other.isConstant;
    }

    public isSubsetOf(other: CatnipValue): boolean {
        // None is a subset of everything
        if (this.isNone) return true;

        // If the other is a constant, to be a subset we must be the same constant
        if (other.isConstant) {
            if (!this.isConstant) return false;
            return this._constantValue === other._constantValue;
        }

        // Otherwise, out format must be a subset of other's format
        return CatnipValueFormatUtils.isAlways(this.format, other.format);
    }

    public toString(): string {
        if (this.isConstant) return `['${this.asConstantString()}' ${CatnipValueFormatUtils.stringify(this.format)}]`;
        else return `[${CatnipValueFormatUtils.stringify(this.format)}]`;
    }
}
