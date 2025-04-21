import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { CatnipWasmStructVariable } from "./CatnipWasmStructVariable";
import { WasmArray, WasmPtr, WasmPtrVoid, WasmStruct, WasmUInt32 } from "./wasm-types";

export const CatnipWasmStructSprite = new WasmStruct("catnip_sprite", {
    
    name: CatnipWasmPtrHeapString,

    variable_count: WasmUInt32,
    variables: new WasmPtr(new WasmArray(new WasmPtr(CatnipWasmStructVariable), null)),

    list_count: WasmUInt32,
    lists: new WasmPtr(new WasmArray(new WasmPtr(CatnipWasmStructVariable), null)),

    target: WasmPtrVoid
});

export const CatnipWasmPtrSprite = new WasmPtr(CatnipWasmStructSprite);