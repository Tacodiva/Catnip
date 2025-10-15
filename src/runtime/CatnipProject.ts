import { CatnipCompiler } from "../compiler/CatnipCompiler";
import { CatnipWasmStructRuntime } from "../wasm-interop/CatnipWasmStructRuntime";
import { WasmPtr, WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipRuntimeModule } from "./CatnipRuntimeModule";
import { CatnipSprite, CatnipSpriteDesc, CatnipSpriteID } from "./CatnipSprite";
import { CatnipEventID, CatnipEventListener } from "../CatnipEvents";
import { CatnipCompilerConfig } from "../compiler/CatnipCompilerConfig";
import { CatnipProjectModule } from "./CatnipProjectModule";

export interface CatnipProjectDesc {
    sprites: CatnipSpriteDesc[];
}

export class CatnipProject {

    public readonly runtimeModule: CatnipRuntimeModule;
    public readonly runtimeInstance: WasmStructWrapper<typeof CatnipWasmStructRuntime>;

    private readonly _sprites: Map<CatnipSpriteID, CatnipSprite>;
    public get sprites(): IterableIterator<CatnipSprite> { return this._sprites.values(); }


    /** @internal */
    constructor(runtime: CatnipRuntimeModule, desc: CatnipProjectDesc) {
        this.runtimeModule = runtime;
        this.runtimeInstance = this.runtimeModule.createRuntimeInstance();

        this._sprites = new Map();

        for (const spriteDesc of desc.sprites)
            this._sprites.set(spriteDesc.id, new CatnipSprite(this, spriteDesc));

        ///

        const spritesArray = this.runtimeModule.allocateMemory(this._sprites.size * WasmPtr.size);

        this.runtimeInstance.setMember("sprite_count", this._sprites.size);
        this.runtimeInstance.setMember("sprites", spritesArray);

        let i = 0;
        for (const sprite of this._sprites.values()) {
            WasmPtr.set(spritesArray + (i * WasmPtr.size), this.runtimeModule.memory, sprite.structWrapper.ptr);
            ++i;
        }
    }

    public async compile(config?: Partial<CatnipCompilerConfig>): Promise<CatnipProjectModule> {
        const compiler = new CatnipCompiler(this, config);

        console.time("compile");
        const module = await compiler.createModule();
        console.timeEnd("compile");

        return module;
    }

    public getSprite(id: CatnipSpriteID): CatnipSprite {
        const sprite = this.tryGetSprite(id);
        if (sprite === undefined)
            throw new Error(`No such sprite with id '${id}'.`);
        return sprite;
    }

    public tryGetSprite(id: CatnipSpriteID): CatnipSprite | undefined {
        return this._sprites.get(id);
    }
}
