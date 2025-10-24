import { CatnipWasmStructList } from "./CatnipWasmStructList";
import { CatnipWasmPtrTarget } from "./CatnipWasmStructTarget";
import { WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid, WasmInt32 } from "./wasm-types";

export const CatnipWasmStructThread = new WasmStruct("catnip_thread", {
    
    runtime: WasmPtrVoid,
    target: CatnipWasmPtrTarget,

    function: WasmPtrVoid,
    status: WasmUInt32,

    ref_count: WasmInt32,
    wait_for_threads: CatnipWasmStructList,

    stack_ptr: WasmPtrVoid,
    stack_end: WasmPtrVoid,
    stack_start: WasmPtrVoid,

});

export const CatnipWasmPtrThread = new WasmPtr(CatnipWasmStructThread);