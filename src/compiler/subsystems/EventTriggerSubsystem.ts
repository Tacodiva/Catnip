import { CatnipEventID } from "../../CatnipEvents";
import { CatnipCompilerModuleSubsystem } from "../CatnipCompilerSubsystem";
import { CatnipCompilerWasmTrigger } from "../wasm/CatnipCompilerWasmTrigger";
import { CatnipIrScriptEventTrigger } from "../ir/core/event_trigger";
import { CatnipCompilerWasmModule } from "../wasm/CatnipCompilerWasmModule";
import { SpiderFunction } from "wasm-spider";
import { CatnipSpriteID } from "../../runtime/CatnipSprite";

export class EventTriggerSubsystem extends CatnipCompilerModuleSubsystem {
    private readonly _triggers: Map<CatnipEventID, CatnipCompilerWasmTrigger>;

    public constructor(module: CatnipCompilerWasmModule) {
        super(module);
        this._triggers = new Map();
    }

    public addTrigger(id: CatnipEventID, spriteID: CatnipSpriteID, trigger: SpiderFunction) {
        let eventInfo = this._triggers.get(id);

        if (eventInfo === undefined) {
            eventInfo = new CatnipCompilerWasmTrigger(this.module, false);
            this._triggers.set(id, eventInfo);
        }

        eventInfo.addListener(trigger, spriteID, 0);
    }

    public preModuleWrite(): void {
        for (const [eventID, eventInfo] of this._triggers)
            this.module.addEventListener(eventID, eventInfo.createTriggerFunction());
    }
}