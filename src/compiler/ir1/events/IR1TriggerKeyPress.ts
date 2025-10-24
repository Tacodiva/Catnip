
import { KeyTriggerSubsystem } from "../../subsystems/KeyTriggerSubsystem";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Trigger } from "../IR1Trigger";

export class IR1TriggerKeyPress extends IR1Trigger {
    public readonly isTopLevel = true;
    public readonly isWarp = false;

    public readonly key: number | null;

    public constructor(key: number | null) {
        super();
        this.key = key;
    }

    public emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.module.getSubsystem(KeyTriggerSubsystem)
            .addKeyListener(this.key, emitter.spriteID, emitter.spiderFunction);
    }

    public stringify(): string {
        return `key_pressed '${this.key ?? "any"}'`;
    }

}
