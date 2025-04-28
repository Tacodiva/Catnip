import { WasmArray, WasmPtrVoid, WasmStruct, WasmUInt32, WasmUInt8 } from "./wasm-types";

export const CatnipWasmStructIoKeys = new WasmStruct("catnip_io_keys", {

    key_down_count: WasmUInt32,
    keys: new WasmArray(WasmUInt8, 256),

});