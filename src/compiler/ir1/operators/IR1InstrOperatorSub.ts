import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrOperatorSub extends IR1Instruction {
    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.f64_sub);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`operator_sub`);
    }
}
