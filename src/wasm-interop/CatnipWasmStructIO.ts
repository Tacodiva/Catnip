import { WasmArray, WasmBool32, WasmFloat64, WasmPtrVoid, WasmStruct, WasmUInt32, WasmUInt8 } from "./wasm-types";

export const CatnipWasmStructIO = new WasmStruct("io", {

    key_down_count: WasmUInt32,
    mouse_down: WasmBool32,
    mouse_x: WasmFloat64,
    mouse_y: WasmFloat64,
    keys: new WasmArray(WasmUInt8, 256),

});