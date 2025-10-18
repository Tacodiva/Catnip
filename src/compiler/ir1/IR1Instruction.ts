import { CatnipCompilerWasmEmitter } from "../wasm/CatnipCompilerWasmEmitter";
import { IR1StringificationContext } from "./IR1StringificationContext";

export type IR1Expression = IR1Instruction[];

export type IR1InstructionArgs<TArgs extends string[] = string[]> = {
    [K in TArgs[number]]: IR1Expression;
}


export abstract class IR1Instruction {

    public abstract stringify(ctx: IR1StringificationContext): void;

    public abstract emitWasm(emitter: CatnipCompilerWasmEmitter): void;
}

