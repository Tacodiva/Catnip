import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrJoin extends IR1Instruction {

    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushRuntime();
        emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_join");
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`join`);
    }
}
