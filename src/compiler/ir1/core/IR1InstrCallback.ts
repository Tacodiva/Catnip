import { SpiderOpcodes } from "wasm-spider";
import { catnip_compiler_callback } from "../../CatnipCompiler";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrCallback extends IR1Instruction {

    public readonly name: string;
    public readonly callback: catnip_compiler_callback;
    public readonly argFormats: readonly CatnipValueFormat[];
    public readonly returnFormat: CatnipValueFormat | null;

    public constructor(name: string, callback: catnip_compiler_callback, args: readonly CatnipValueFormat[], returnFormat: CatnipValueFormat | null) {
        super();
        this.name = name;
        this.callback = callback;
        this.argFormats = args;
        this.returnFormat = returnFormat;
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`callback '${this.name}'`);
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.call, 
            emitter.module.importCallback(this.name, this.callback, this.argFormats, this.returnFormat)
        );
    }

}
