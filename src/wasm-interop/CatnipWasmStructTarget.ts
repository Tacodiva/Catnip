import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { CatnipWasmUnionValue } from "./CatnipWasmStructValue";
import { WasmInt32, WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid, WasmArray } from "./wasm-types";

export const CatnipWasmStructTarget = new WasmStruct("catnip_target", {
    runtime: WasmPtrVoid,
    sprite: CatnipWasmPtrSprite,
    flags: WasmUInt32,

    next_global: WasmPtrVoid,
    prev_global: WasmPtrVoid,

    next_sprite: WasmPtrVoid,
    prev_sprite: WasmPtrVoid,

    variable_table: new WasmPtr(new WasmArray(CatnipWasmUnionValue, null)),

    position_x: WasmInt32,
    position_y: WasmInt32,
});

export const CatnipWasmPtrTarget = new WasmPtr(CatnipWasmStructTarget);