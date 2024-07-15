
import { WasmPtr, WasmStruct, WasmUInt32 } from './wasm-types';

export const CatnipWasmStructHeapString = new WasmStruct("catnip_hstring_header", {

    refcount: WasmUInt32,
    bytelen: WasmUInt32,

});

export const CatnipWasmPtrHeapString = new WasmPtr(CatnipWasmStructHeapString);