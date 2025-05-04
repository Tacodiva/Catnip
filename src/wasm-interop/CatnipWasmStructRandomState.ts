import { WasmPtr, WasmStruct, WasmUInt64 } from "./wasm-types";

export const CatnipWasmStructRandomState = new WasmStruct("catnip_variable", {
    
    state0: WasmUInt64,
    state1: WasmUInt64,

});
