import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { WasmFloat64, WasmStruct, WasmUInt32 } from "./wasm-types";


export enum CatnipWasmEnumValueFlags {
    VAL_STRING = 1 << 0,
    VAL_DOUBLE = 1 << 1
}

export const CatnipWasmStructValue = new WasmStruct("catnip_value", {
    
    flags: WasmUInt32,
    val_string: CatnipWasmPtrHeapString,
    val_double: WasmFloat64

});