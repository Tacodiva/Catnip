
import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { IR1Function } from "../IR1Function";
import { IR1ExternalValue, IR1ExternalValueType } from "../IR1ExternalValue";

export class IR1InstrPushExternalValue extends IR1Instruction {

    public value: IR1ExternalValue;

    public constructor(value: IR1ExternalValue) {
        super();
        this.value = value;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushExternalValue(this.value);
    }

    public stringify(ctx: IR1StringificationContext): void {
        let extraInfo = "";

        switch (this.value.type) {
            case IR1ExternalValueType.PROCEDURE_ARGUMENT:
                extraInfo = `#${this.value.index}`;
                break;

        }
        
        ctx.writeLine(`push_external ${IR1ExternalValueType[this.value.type]} ${extraInfo}`);
    }

}