import { CatnipCompilerWasmEmitter } from "../wasm/CatnipCompilerWasmEmitter";
import { IR1StringificationContext } from "./IR1StringificationContext";

export abstract class IR1Trigger {

    public readonly abstract isTopLevel: boolean;

    public abstract emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void;
    public abstract stringify(): string;

}

