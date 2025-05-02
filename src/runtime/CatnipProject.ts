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
import { CatnipEventArgs, CatnipEventID, CatnipEventListener } from "../CatnipEvents";
import { CatnipProjectModule } from "../compiler/CatnipProjectModule";

export interface CatnipProjectDesc {
    sprites: CatnipSpriteDesc[];
}

interface EventInfo<TEventID extends CatnipEventID = CatnipEventID> {
    rawListeners: ((...args: any[]) => void)[];
    jsListeners: CatnipEventListener<TEventID>[];
}

export class CatnipProject {

    public readonly runtimeModule: CatnipRuntimeModule;
    public readonly runtimeInstance: WasmStructWrapper<typeof CatnipWasmStructRuntime>;

    private _projectModule: CatnipProjectModule | null;

    private readonly _sprites: Map<CatnipSpriteID, CatnipSprite>;
    private _rewriteSpritesList: boolean;
    private _rewriteSprites: Set<CatnipSprite>;

    private readonly _events: Map<CatnipEventID, EventInfo>;

    private _recompileScripts: Set<CatnipScript>;

    /** @internal */
    public constructor(runtime: CatnipRuntimeModule, desc: CatnipProjectDesc) {
        this.runtimeModule = runtime;
        this.runtimeInstance = this.runtimeModule.createRuntimeInstance();

        this._sprites = new Map();
        this._projectModule = null;

        this._rewriteSpritesList = true;
        this._rewriteSprites = new Set();
        this._recompileScripts = new Set();

        this._events = new Map();

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

    public getSprite(id: CatnipSpriteID): CatnipSprite {
        const sprite = this.tryGetSprite(id);
        if (sprite === undefined)
            throw new Error(`No such sprite with id '${id}'.`);
        return sprite;
    }

    public tryGetSprite(id: CatnipSpriteID): CatnipSprite | undefined {
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

    private _getEventInfo<TEventID extends CatnipEventID>(event: TEventID): EventInfo<TEventID> {
        let eventInfo = this._events.get(event);
        if (eventInfo === undefined) {
            eventInfo = {
                jsListeners: [],
                rawListeners: []
            };
            this._events.set(event, eventInfo);
        }
        return eventInfo as EventInfo<TEventID>;
    }

    public registerEventListener<TEventID extends CatnipEventID>(event: TEventID, listener: CatnipEventListener<TEventID>) {
        this._getEventInfo(event).jsListeners.push(listener);
    }

    public registerRawEventListener<TEventID extends CatnipEventID>(event: TEventID, listener: (...args: any[]) => void) {
        this._getEventInfo(event).rawListeners.push(listener);
    }

    public getEventIDs(): IterableIterator<CatnipEventID> {
        return this._events.keys();
    }

    public hasEventListeners(event: CatnipEventID): boolean {
        const info = this._events.get(event);
        if (info === undefined) return false;
        return info.jsListeners.length !== 0 || info.rawListeners.length !== 0;
    }

    public getEventListeners<TEventID extends CatnipEventID>(event: TEventID): readonly CatnipEventListener<TEventID>[] {
        return this._events.get(event)?.jsListeners ?? [];
    }

    public getRawEventListeners<TEventID extends CatnipEventID>(event: TEventID): readonly ((...args: any[]) => void)[] {
        return this._events.get(event)?.rawListeners ?? [];
    }

    public triggerEvent<TEventID extends CatnipEventID>(event: TEventID, ...args: CatnipEventArgs<TEventID>): void {
        if (this._projectModule === null) this.rewrite();
        this._projectModule!.triggerEvent(event, ...args);
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

        console.time("compile");
        for (const script of this._recompileScripts) {
            compiler.addScript(script);
        }

        this._projectModule = await compiler.createModule();
        console.timeEnd("compile");

        if (globalThis.document && window.location.href.search("download") !== -1) {
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

        // const stage = [...this._sprites.values()][0];
        // const printVariable = stage.getVariable("2");

        // for (let tick = 1; tick <= 20; tick++) {
        //     // console.time("" + tick);
        //     this.runtimeModule.functions.catnip_runtime_tick(this.runtimeInstance.ptr);
        //     // console.timeEnd("" + tick);
        //     // if (printVariable !== undefined) {
        //     //     console.log("nth = " + printVariable.sprite.defaultTarget.structWrapper.getMemberWrapper("variable_table").getInnerWrapper().getElementWrapper(printVariable._index).getMemberWrapper(0).get());
        //     // }
        // }
    }

    public start(): void {
        this._projectModule?.triggerEvent("PROJECT_START");
    }

    public step(): void {
        this.runtimeModule.functions.catnip_runtime_tick(this.runtimeInstance.ptr);
        this._penFlush();
    }

    private _penFlush(): void {
        this.runtimeModule.functions.catnip_runtime_render_pen_flush(this.runtimeInstance.ptr);
    }

    /** Creates a new garbage collectable string associated with this project. */
    public createNewString(str: string): number {
        return this.runtimeModule.createNewString(this.runtimeInstance, str);
    }
}
