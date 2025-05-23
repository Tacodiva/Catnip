import { CatnipWasmStructCostume } from "../wasm-interop/CatnipWasmStructCostume";
import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipSprite } from "./CatnipSprite";

export interface CatnipCostumeDesc {
    name: string;
}

export class CatnipCostume {
    public readonly sprite: CatnipSprite;
    public get runtime() { return this.sprite.runtime; }
    public readonly index: number;
    public readonly name: string;

    public constructor(sprite: CatnipSprite, index: number, desc: CatnipCostumeDesc) {
        this.sprite = sprite;
        this.index = index;
        this.name = desc.name;
    }

    /** @internal */
    _write(struct: WasmStructWrapper<typeof CatnipWasmStructCostume>) {
        struct.setMember("name", this.runtime.createCanonHString(this.name));
    }
}