
import { WasmPtr, WasmStruct, WasmUInt16, WasmUInt32 } from './wasm-types';

export const CATNIP_STRING_HEADER_MAGIC: number = 0x7729;

export const CatnipWasmStructHeapString = new WasmStruct("catnip_hstring_header", {

    refcount: WasmUInt32,
    bytelen: WasmUInt32,
    move_ptr: WasmUInt32,
    externref_count: WasmUInt16,
    magic: WasmUInt16,

});

export const CatnipWasmPtrHeapString = new WasmPtr(CatnipWasmStructHeapString);