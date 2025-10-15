import { CatnipCompilerWasmEmitter } from "../wasm/CatnipCompilerWasmEmitter";
import { IR1StringificationContext } from "./IR1";

export abstract class IR1Trigger {

    public abstract emitEntryWasm(emitter: CatnipCompilerWasmEmitter): void;
    public abstract stringify(): string;

}

