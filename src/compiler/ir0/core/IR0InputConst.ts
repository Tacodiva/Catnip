import { Cast, catnip_compiler_constant } from "../../cast";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { IR1InstrConst } from "../../ir1/core/IR1InstrConst";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input } from "../IR0Node";


export class IR0InputConst extends IR0Input<[]> {
    public value: catnip_compiler_constant;
    public format: CatnipValueFormat | null;

    public constructor(value: catnip_compiler_constant, format?: CatnipValueFormat | null) {
        super("const", {});
        this.value = value;
        this.format = format ?? null;
    }

    public getResultFormat(): CatnipValueFormat {
        const numberCast = Cast.toNumber(this.value);

        const isValidNumber = Cast.toString(numberCast) === Cast.toString(this.value);

        if (this.format === null) {
            if (isValidNumber)
                return CatnipValueFormatUtils.getNumberFormat(numberCast);

            return CatnipValueFormat.I32_HSTRING;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.I32_NUMBER) && isValidNumber) {
            if (Number.isInteger(numberCast) && numberCast <= 2147483647 && numberCast >= -2147483648)
                return CatnipValueFormat.I32_NUMBER;
        }

        if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_NUMBER_OR_NAN) && CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            if (isValidNumber)
                return CatnipValueFormatUtils.getNumberFormat(numberCast);

            return CatnipValueFormat.F64_BOXED_I32_HSTRING;
        }
        return this.format;
    }

    public getResult(): CatnipValue {
        return CatnipValue.constant(this.value, this.getResultFormat());
    }

    public requestResultFormat(format: CatnipValueFormat): void {
        this.format = format;
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.value}" shape=plain]`;
    }

    public emitIR1(emitter: IR1Emitter) {
        emitter.emitIR1(new IR1InstrConst(this.value, this.getResultFormat()));
    }

    public clone() {
        return new IR0InputConst(this.value, this.format);
    }
}
