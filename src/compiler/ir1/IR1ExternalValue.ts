import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";

export enum IR1ExternalValueType {
    RETURN_LOCATION,
    PROCEDURE_ARGUMENT,
}

export interface IR1ExternalValueProcedureArgument {
    type: IR1ExternalValueType.PROCEDURE_ARGUMENT,
    index: number
};

export interface IR1ExternalValueReturnLocation {
    type: IR1ExternalValueType.RETURN_LOCATION
}

export type IR1ExternalValue =
    IR1ExternalValueProcedureArgument |
    IR1ExternalValueReturnLocation;

export const IR1ExternalValue = new class {
    public getSpiderType(value: IR1ExternalValue): SpiderNumberType {
        return CatnipValueFormatUtils.getFormatSpiderType(this.getFormat(value));
    }

    public getFormat(value: IR1ExternalValue): CatnipValueFormat {
        switch (value.type) {
            case IR1ExternalValueType.PROCEDURE_ARGUMENT:
                return CatnipValueFormat.F64;
            case IR1ExternalValueType.RETURN_LOCATION:
                return CatnipValueFormat.I32_NUMBER;
        }
    }

    public areEquivalent(a: IR1ExternalValue, b: IR1ExternalValue): boolean {
        if (a.type !== b.type) return false;

        switch (a.type) {
            case IR1ExternalValueType.RETURN_LOCATION:
                return true;
            case IR1ExternalValueType.PROCEDURE_ARGUMENT:
                // Typescript is too silly to realize we already made sure that this is true
                CatnipCompilerLogger.assert(b.type === IR1ExternalValueType.PROCEDURE_ARGUMENT);
                return a.index === b.index;
        }
    }
}; 