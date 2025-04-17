import { CatnipWasmPtrRuntimeGcStats } from "./CatnipWasmStructRuntimeGcStats";
import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { WasmArray, WasmPtr, WasmStruct, WasmUInt32 } from "./wasm-types";

export const CatnipWasmStructRuntime = new WasmStruct("catnip_runtime", {

    sprite_count: WasmUInt32,
    sprites: new WasmPtr(new WasmArray(CatnipWasmPtrSprite, null)),
    
    targets: CatnipWasmPtrTarget,

    // Should be a struct but I'm lazy
    threads_length: WasmUInt32,
    threads_capacity: WasmUInt32,
    threads_data: WasmUInt32,

    gc_stats: CatnipWasmPtrRuntimeGcStats,

});