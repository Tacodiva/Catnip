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

    private _name: string;
    private _rewriteName: boolean;

    public readonly structWrapper: WasmStructWrapper<typeof CatnipWasmStructVariable>;

    private _dependantScripts: Set<CatnipScript>;

    /** @internal */
    _index: number;

    public constructor(sprite: CatnipSprite, desc: CatnipListDesc) {
        this.sprite = sprite;
        this.id = desc.id;

        this._name = desc.name;
        this._rewriteName = true;

        this._dependantScripts = new Set();

        this.structWrapper = this.runtime.allocateStruct(CatnipWasmStructVariable);
        this._index = 0;
    }

    public get name() { return this._name; }
    public set name(value: string) {
        this._rewriteName = true;
        this._triggerRewrite();
        this._name = value;
    }

    private _triggerRewrite() {
        this.sprite._rewriteList(this);
    }

    private _isValid(): boolean {
        return this.sprite.getList(this.id) == this;
    }

    public delete(): boolean {
        return this.sprite.deleteList(this);
    }

    public addDependantScript(script: CatnipScript) {
        this._dependantScripts.add(script);
    }

    public removeDependantScript(script: CatnipScript): boolean {
        return this._dependantScripts.delete(script);
    }

    /** @internal */
    _onDelete() {
        for (const dependantScript of this._dependantScripts) {
            dependantScript.triggerRecompile();
        }
    }

    /** @internal */
    _rewrite() {
        if (this._rewriteName) {
            let namePtr = this.structWrapper.getMember("name");
            // if (namePtr !== 0) this.runtime.functions.catnip_hstring_deref(namePtr); TODO
            namePtr = this.runtime.createCanonHString(this.name);
            this.structWrapper.setMember("name", namePtr);
        }
    }
}
