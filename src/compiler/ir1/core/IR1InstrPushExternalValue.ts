
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1ExternalValue } from "../IR1ExternalValue";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrPushExternalValue extends IR1Instruction {

    public value: IR1ExternalValue;

    public constructor(value: IR1ExternalValue) {
        super();
        this.value = value;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.local_get, emitter.getExternalValueLocal(this.value));
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`push_external ${IR1ExternalValue.stringify(this.value)}`);
    }

}