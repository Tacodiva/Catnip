import { CatnipWasmPtrSprite } from "./CatnipWasmStructSprite";
import { WasmInt32, WasmPtr, WasmStruct, WasmUInt32, WasmPtrVoid } from "./wasm-types";

export const CatnipWasmStructTarget = new WasmStruct("catnip_target", {
    sprite: CatnipWasmPtrSprite,
    flags: WasmUInt32,
    next: WasmPtrVoid,

    position_x: WasmInt32,
    position_y: WasmInt32,
});

export const CatnipWasmPtrTarget = new WasmPtr(CatnipWasmStructTarget);