import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { WasmArray, WasmPtr, WasmStruct, WasmUInt32 } from "./wasm-types";

export const CatnipWasmStructRuntime = new WasmStruct("catnip_runtime", {

    sprite_count: WasmUInt32,
    sprites: new WasmPtr(new WasmArray(CatnipWasmPtrSprite, null)),
    
    targets: CatnipWasmPtrTarget
    
});