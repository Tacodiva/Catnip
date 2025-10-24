
import { BroadcastSubsystem } from "../../subsystems/BroadcastSubsystem";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Trigger } from "../IR1Trigger";

export class IR1TriggerBroadcast extends IR1Trigger {
    public readonly isTopLevel = true;
    public readonly isWarp = false;

    public readonly broadcastName: string;

    public constructor(broadcastName: string) {
        super();
        this.broadcastName = broadcastName;
    }

    public emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.module.getSubsystem(BroadcastSubsystem)
            .addBroadcastListener(this.broadcastName, emitter.spriteID, emitter.spiderFunction);
    }

    public stringify(): string {
        return `broadcast '${this.broadcastName}'`;
    }

}
