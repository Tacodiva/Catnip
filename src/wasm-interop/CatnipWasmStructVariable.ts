import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { CatnipWasmStructValue } from "./CatnipWasmStructValue";
import { WasmStruct } from "./wasm-types";

export const CatnipWasmStructVariable = new WasmStruct("catnip_variable", {
    
    name: CatnipWasmPtrHeapString,
    default_value: CatnipWasmStructValue,

});