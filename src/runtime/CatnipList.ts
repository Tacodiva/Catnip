import { CatnipWasmStructVariable } from "../wasm-interop/CatnipWasmStructVariable";
import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipScript } from "./CatnipScript";
import { CatnipSprite } from "./CatnipSprite";

export type CatnipListID = string;

export interface CatnipListDesc {
    id: CatnipListID;
    name: string;
}

export class CatnipList {
    public readonly sprite: CatnipSprite;
    public get runtime() { return this.sprite.runtime; }
    public readonly id: CatnipListID;

    public readonly name: string;
    public readonly index: number;

    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructVariable>;

    /** @internal */
    constructor(sprite: CatnipSprite, index: number, desc: CatnipListDesc) {
        this.sprite = sprite;
        this.id = desc.id;

        this.name = desc.name;
        this.index = index;

        this.structWrapper = this.runtime.allocateStruct(CatnipWasmStructVariable);

        this.structWrapper.setMember("name", this.runtime.createCanonHString(this.name));
    }
}
