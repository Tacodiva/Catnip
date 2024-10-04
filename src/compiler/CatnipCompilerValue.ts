import { Cast, catnip_compiler_constant } from "./cast";
import { CatnipValueFormat } from "./CatnipValueFormat";

export class CatnipCompilerValue {
    public static constant(value: catnip_compiler_constant, format: CatnipValueFormat) {
        return new CatnipCompilerValue(format, value);
    }

    public static dynamic(format: CatnipValueFormat) {
        return new CatnipCompilerValue(format, null);
    }

    public readonly format: CatnipValueFormat;

    private readonly _constantValue: catnip_compiler_constant | null;

    public get constantValue(): catnip_compiler_constant {
        if (this._constantValue === null)
            throw new Error("Value is not constant.");
        return this._constantValue;
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

    public or(other: CatnipCompilerValue): CatnipCompilerValue {
        if (this.isConstant && other.isConstant) {
            if (this._constantValue === other._constantValue)
                return this;
        }

        return new CatnipCompilerValue(this.format | other.format, null);
    }

    public equals(other: CatnipCompilerValue): boolean {
        if (this.format !== other.format)
            return false;

        if (this.isConstant && other.isConstant)
            return this._constantValue === other._constantValue;

        return this.isConstant === other.isConstant;
    }
}
