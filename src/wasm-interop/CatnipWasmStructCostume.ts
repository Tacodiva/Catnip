import { CatnipWasmPtrHeapString } from "./CatnipWasmStructHeapString";
import { WasmFloat32, WasmStruct } from "./wasm-types";

export const CatnipWasmStructCostume = new WasmStruct("catnip_costume", {
    
    name: CatnipWasmPtrHeapString,

    aabb_left: WasmFloat32,
    aabb_right: WasmFloat32,
    aabb_top: WasmFloat32,
    aabb_bottom: WasmFloat32,

});