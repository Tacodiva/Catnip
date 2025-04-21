import { WasmPtrVoid, WasmStruct, WasmUInt32 } from "./wasm-types";

export const CatnipWasmStructList = new WasmStruct("catnip_list", {

    length: WasmUInt32,
    capacity: WasmUInt32,
    data: WasmPtrVoid,

});