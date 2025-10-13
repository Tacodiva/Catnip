import { Cast, catnip_compiler_constant } from "../../cast";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { IR1InstrJoin, IR1InstrLog } from "../../ir1/instructions/blah";
import { IR1InstrConst } from "../../ir1/instructions/IR1InstrConst";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0Input, IR0Command } from "../IR0";
import { IR0Trigger } from "../IR0Trigger";

export class IR0CmdLog extends IR0Command<["msg"]> {

    public constructor(value: IR0Input) {
        super("log", {
            msg: { value, format: CatnipValueFormat.I32_HSTRING }
        });
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrLog();
    }
}

export class IR0InputConst extends IR0Input<[]> {

    public value: catnip_compiler_constant;
    public format: CatnipValueFormat | null;

    public constructor(value: catnip_compiler_constant) {
        super("const", {});
        this.value = value;
        this.format = null;
    }

    private _isValidNumber(): boolean {
        return Cast.toString(Cast.toNumber(this.value)) === this.value;
    }

    public getResultFormat(): CatnipValueFormat {
        if (this.format === null) {
            if (this._isValidNumber())
                return CatnipValueFormatUtils.getNumberFormat(Cast.toNumber(this.value));

            return CatnipValueFormat.I32_HSTRING;
        } else if (CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_NUMBER_OR_NAN) && CatnipValueFormatUtils.isSometimes(this.format, CatnipValueFormat.F64_BOXED_I32_HSTRING)) {
            if (this._isValidNumber())
                return CatnipValueFormatUtils.getNumberFormat(Cast.toNumber(this.value));

            return CatnipValueFormat.F64_BOXED_I32_HSTRING;
        } else {
            return this.format;
        }
    }

    public requestResultFormat(format: CatnipValueFormat): void {
        if (this.format !== null && CatnipValueFormatUtils.isSometimes(this.format, format)) {
            this.format &= format;
        } else {
            this.format = format;
        }
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.value}" shape=plain]`;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrConst(this.value, this.getResultFormat());
    }
}


export class IR0InputJoin extends IR0Input<["left", "right"]> {
    public constructor(left: IR0Input, right: IR0Input) {
        super("join", {
            left: { value: left, format: CatnipValueFormat.I32_HSTRING },
            right: { value: right, format: CatnipValueFormat.I32_HSTRING }
        });
    }

    public getResultFormat(): CatnipValueFormat {
        return CatnipValueFormat.I32_HSTRING;
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrJoin();
    }
}

export class IR0TriggerEvent extends IR0Trigger {
    public name: string = "Green Flag";
    public isWarp: boolean = false;
}