import { CatnipWasmStructIO } from "./CatnipWasmStructIO";
import { CatnipWasmStructList } from "./CatnipWasmStructList";
import { CatnipWasmStructRandomState } from "./CatnipWasmStructRandomState";
import { CatnipWasmPtrRuntimeGcStats } from "./CatnipWasmStructRuntimeGcStats";
import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { WasmArray, WasmInt32, WasmPtr, WasmPtrVoid, WasmStruct, WasmUInt32, WasmUInt64 } from "./wasm-types";

export const CatnipWasmStructRuntime = new WasmStruct("catnip_runtime", {

    sprite_count: WasmUInt32,
    sprites: new WasmPtr(new WasmArray(CatnipWasmPtrSprite, null)),
    
    targets: CatnipWasmPtrTarget,

    threads: CatnipWasmStructList,
    num_active_threads: WasmUInt32,

    gc_stats: CatnipWasmPtrRuntimeGcStats,
    gc_page_index: WasmInt32,
    gc_page: WasmPtrVoid,
    gc_pages: CatnipWasmStructList,
    gc_large_objs: CatnipWasmStructList,

    pen_line_buffer_length: WasmUInt32,
    pen_line_buffer: WasmPtrVoid,

    io: new WasmPtr(CatnipWasmStructIO),
    random_state: new WasmPtr(CatnipWasmStructRandomState),

    time: WasmUInt64,
    timer_start: WasmUInt64,
});