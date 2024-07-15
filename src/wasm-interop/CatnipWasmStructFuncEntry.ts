
import { WasmArray, WasmPtrVoid, WasmStruct, WasmStructValue, WasmTypeValue, WasmTypeValueWrapper, WasmUInt32 } from './wasm-types';

export const CatnipWasmStructFuncEntry = new WasmStruct("catnip_func_entry", {

    func_id: WasmUInt32,
    func_ptr: WasmPtrVoid,

});

export const CatnipWasmArrayFuncEntry = new WasmArray(CatnipWasmStructFuncEntry, null);