import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { CatnipWasmStructVariable } from "./CatnipWasmStructVariable";
import { WasmArray, WasmPtr, WasmStruct, WasmUInt32 } from "./wasm-types";

export const CatnipWasmStructSprite = new WasmStruct("catnip_sprite", {
    
    name: CatnipWasmPtrHeapString,

    variable_count: WasmUInt32,
    variables: new WasmPtr(new WasmArray(new WasmPtr(CatnipWasmStructVariable), null))

});

export const CatnipWasmPtrSprite = new WasmPtr(CatnipWasmStructSprite);