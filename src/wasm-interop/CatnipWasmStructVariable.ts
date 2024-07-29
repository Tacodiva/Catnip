import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { WasmStruct } from "./wasm-types";

export const CatnipWasmStructVariable = new WasmStruct("catnip_variable", {
    
    name: CatnipWasmPtrHeapString,

});