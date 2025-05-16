import { WasmPtr, WasmStruct, WasmStructValue, WasmUInt32 } from "./wasm-types";

const CatnipWasmStructRuntimeGcStatsMembers = {
    total_memory: WasmUInt32,
    total_page_memory: WasmUInt32,
    total_used_page_memory: WasmUInt32,

    num_pages: WasmUInt32,
    num_lrg_objs: WasmUInt32,
    num_sml_objs: WasmUInt32,
        
    latest_peak_memory: WasmUInt32,
    latest_num_gc_roots: WasmUInt32,
    latest_freed_sml_obj_count: WasmUInt32,
    latest_freed_lrg_obj_count: WasmUInt32,
    latest_moved_sml_obj_count: WasmUInt32,
    latest_moved_pointer_count: WasmUInt32,
    latest_freed_pages: WasmUInt32,
};

export const CatnipWasmStructRuntimeGcStats = new WasmStruct("catnip_runtime_gc_stats", CatnipWasmStructRuntimeGcStatsMembers);

export const CatnipWasmPtrRuntimeGcStats = new WasmPtr(CatnipWasmStructRuntimeGcStats);

export type CatnipRuntimeGcStats = WasmStructValue<typeof CatnipWasmStructRuntimeGcStatsMembers>;