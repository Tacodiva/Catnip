import { SpiderModule, compileModule, createModule, writeModule } from "wasm-spider";
import { CatnipCompiler } from "../compiler/CatnipCompiler";
import { CatnipWasmStructRuntime } from "../wasm-interop/CatnipWasmStructRuntime";
import { CatnipWasmStructSprite } from "../wasm-interop/CatnipWasmStructSprite";
import { WasmPtr, WasmStructWrapper } from "../wasm-interop/wasm-types";
import { CatnipRuntimeModule } from "./CatnipRuntimeModule";
import { CatnipScript } from "./CatnipScript";
import { CatnipSprite, CatnipSpriteDesc, CatnipSpriteID } from "./CatnipSprite";
import { CatnipWasmStructTarget } from "../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../wasm-interop/CatnipWasmStructValue";

export interface CatnipProjectDesc {
    sprites: CatnipSpriteDesc[];
}

export class CatnipProject {

    public readonly runtimeModule: CatnipRuntimeModule;
    public readonly runtimeInstance: WasmStructWrapper<typeof CatnipWasmStructRuntime>;

    private readonly _sprites: Map<CatnipSpriteID, CatnipSprite>;
    private _rewriteSpritesList: boolean;
    private _rewriteSprites: Set<CatnipSprite>;

    private _recompileScripts: Set<CatnipScript>;

    /** @internal */
    public constructor(runtime: CatnipRuntimeModule, desc: CatnipProjectDesc) {
        this.runtimeModule = runtime;
        this._sprites = new Map();

        this.runtimeInstance = this.runtimeModule.createRuntimeInstance();

        this._rewriteSpritesList = true;
        this._rewriteSprites = new Set();
        this._recompileScripts = new Set();

        for (const spriteDesc of desc.sprites)
            this.createSprite(spriteDesc);
    }

    public createSprite(desc: CatnipSpriteDesc): CatnipSprite {
        const sprite = new CatnipSprite(this, desc);
        this._sprites.set(sprite.id, sprite);
        this._rewriteSpritesList = true;
        this._rewriteSprites.add(sprite);
        return sprite;
    }

    public getSprite(id: CatnipSpriteID): CatnipSprite | undefined {
        return this._sprites.get(id);
    }

    public deleteSprite(sprite: CatnipSprite): boolean {
        if (this._sprites.delete(sprite.id)) {
            this._rewriteSprites.delete(sprite);
            this._rewriteSpritesList = true;
            return true;
        }
        return false;
    }

    public rewrite(): Promise<void> {
        return this._rewrite();
    }

    /** @internal */
    _addRewriteSprite(sprite: CatnipSprite) {
        this._rewriteSprites.add(sprite);
    }

    /** @internal */
    _removeRewriteSprite(sprite: CatnipSprite) {
        this._rewriteSprites.delete(sprite);
    }

    /** @internal */
    _addRecompileScript(sprite: CatnipScript) {
        this._recompileScripts.add(sprite);
    }

    /** @internal */
    _removeRecompileScript(sprite: CatnipScript) {
        this._recompileScripts.delete(sprite);
    }

    private async _rewrite(): Promise<void> {
        if (this._rewriteSpritesList) {
            let spritesArray = this.runtimeInstance.getMember("sprites");
            if (spritesArray !== 0)
                this.runtimeModule.freeMemory(spritesArray);

            spritesArray = this.runtimeModule.allocateMemory(this._sprites.size * WasmPtr.size);

            this.runtimeInstance.setMember("sprite_count", this._sprites.size);
            this.runtimeInstance.setMember("sprites", spritesArray);

            let i = 0;
            for (const sprite of this._sprites.values()) {
                WasmPtr.set(spritesArray + (i * WasmPtr.size), this.runtimeModule.memory, sprite.structWrapper.ptr);
                ++i;
            }

            this._rewriteSpritesList = false;
        }

        if (this._rewriteSprites.size !== 0) {
            for (const sprite of this._rewriteSprites)
                sprite._rewrite();
        }

        await this._recompile();
    }

    private async _recompile(): Promise<void> {
        if (this._recompileScripts.size === 0) return;

        const compiler = new CatnipCompiler(this);

        for (const script of this._recompileScripts) {
            compiler.compile(script);
        }

        if (globalThis.document) {
            const downloadURL = (data: string, fileName: string) => {
                const a = document.createElement('a')
                a.href = data
                a.download = fileName
                document.body.appendChild(a)
                a.style.display = 'none'
                a.click()
                a.remove()
            }

            const downloadBlob = (data: Uint8Array, fileName: string, mimeType: string) => {

                const blob = new Blob([data], {
                    type: mimeType
                })

                const url = window.URL.createObjectURL(blob)

                downloadURL(url, fileName)

                setTimeout(() => window.URL.revokeObjectURL(url), 1000)
            }
            downloadBlob(writeModule(compiler.spiderModule), "module.wasm", "application/wasm");
        }

        const module = await compileModule(compiler.spiderModule);

        const instance = await WebAssembly.instantiate(module, {
            env: {
                memory: this.runtimeModule.imports.env.memory,
                indirect_function_table: this.runtimeModule.indirectFunctionTable
            },
            catnip: this.runtimeModule.functions
        });

        const sprite = this._sprites.get("sprite")!;
        const thread = this.runtimeModule.functions.catnip_thread_new(sprite.defaultTarget.structWrapper.ptr, 1);

        for (let tick = 1; tick <= 10; tick++) {
            console.time(""+tick);
            this.runtimeModule.functions.catnip_runtime_tick(this.runtimeInstance.ptr);
            console.timeEnd(""+tick);
            console.log("nth = " + sprite.defaultTarget.structWrapper.getMemberWrapper("variable_table").getInnerWrapper().getElementWrapper(this.getSprite("sprite")!.getVariable("nth")!._index).getMemberWrapper(0).get());
        }
    }
}
