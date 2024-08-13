import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { WasmFloat64, WasmStruct, WasmUInt32, WasmUnion } from "./wasm-types";

export const VALUE_CANNON_NAN_UPPER: number = 0x7FF80000; // All exponent bits + significand bit #52
export const VALUE_STRING_UPPER: number = 0x7FF80001; // All exponent bits + significand bit #52 + significand bit #33

export const CatnipWasmStructValue = new WasmStruct("catnip_value", {
    upper: WasmUInt32,
    lower: CatnipWasmPtrHeapString
});

export const CatnipWasmUnionValue = new WasmUnion("catnip_value_union", [
    WasmFloat64,
    CatnipWasmStructValue
] as const);