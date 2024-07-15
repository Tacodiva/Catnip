import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid } from "./wasm-types";

export const CatnipWasmStructThread = new WasmStruct("catnip_thread", {
    
    target: CatnipWasmPtrTarget,
    function: WasmPtrVoid,
    status: WasmUInt32

});

export const CatnipWasmPtrThread = new WasmPtr(CatnipWasmStructThread);