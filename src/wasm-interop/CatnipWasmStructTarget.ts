import { CatnipWasmStructList } from "./CatnipWasmStructList";
import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmUnionValue } from "./CatnipWasmStructValue";
import { WasmInt32, WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid, WasmArray, WasmBool32, WasmFloat32, WasmFloat64 } from "./wasm-types";

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

    position_x: WasmFloat64,
    position_y: WasmFloat64,
    direction: WasmFloat64,
    size: WasmFloat64,
    costume: WasmUInt32,

    pen_down: WasmBool32,
    pen_thickness: WasmFloat32,

    pen_argb_valid: WasmBool32,
    pen_argb: WasmUInt32,
    
    pen_thsv_valid: WasmBool32,
    pen_transparnecy: WasmFloat64,
    pen_hue: WasmFloat64,
    pen_saturation: WasmFloat64,
    pen_value: WasmFloat64,
});

export const CatnipWasmPtrTarget = new WasmPtr(CatnipWasmStructTarget);