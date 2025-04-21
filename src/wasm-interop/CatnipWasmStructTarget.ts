import { CatnipWasmStructList } from "./CatnipWasmStructList";
import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmUnionValue } from "./CatnipWasmStructValue";
import { WasmInt32, WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid, WasmArray, WasmBool32, WasmFloat32 } from "./wasm-types";

export const CatnipWasmStructTarget = new WasmStruct("catnip_target", {
    runtime: WasmPtrVoid,
    sprite: CatnipWasmPtrSprite,
    flags: WasmUInt32,

    next_global: WasmPtrVoid,
    prev_global: WasmPtrVoid,

    next_sprite: WasmPtrVoid,
    prev_sprite: WasmPtrVoid,

    variable_table: new WasmPtr(new WasmArray(CatnipWasmUnionValue, null)),
    list_table: new WasmPtr(new WasmArray(CatnipWasmStructList, null)),

    position_x: WasmInt32,
    position_y: WasmInt32,
    direction: WasmInt32,
    size: WasmInt32,
    costume: WasmUInt32,

    pen_down: WasmBool32,
    pen_thickness: WasmFloat32,
    pen_r: WasmFloat32,
    pen_g: WasmFloat32,
    pen_b: WasmFloat32,
    pen_a: WasmFloat32,
    
});

export const CatnipWasmPtrTarget = new WasmPtr(CatnipWasmStructTarget);