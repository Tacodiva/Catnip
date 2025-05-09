import { CatnipWasmStructVariable } from "../wasm-interop/CatnipWasmStructVariable";
import { WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipScript } from "./CatnipScript";
import { CatnipSprite } from "./CatnipSprite";

export type CatnipVariableID = string;

export interface CatnipVariableDesc {
    id: CatnipVariableID;
    name: string;
}

export class CatnipVariable {
    public readonly sprite: CatnipSprite;
    public get runtime() { return this.sprite.runtime; }
    public readonly id: CatnipVariableID;

    public readonly name: string;
    public readonly index: number;

    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructVariable>;

    /** @internal */
    constructor(sprite: CatnipSprite, index: number, desc: CatnipVariableDesc) {
        this.sprite = sprite;
        this.id = desc.id;

        this.name = desc.name;
        this.index = index;

        this.structWrapper = this.runtime.allocateStruct(CatnipWasmStructVariable);

        this.structWrapper.setMember("name", this.runtime.createCanonHString(this.name));
    }
}