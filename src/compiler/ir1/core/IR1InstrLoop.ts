import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrLoop extends IR1Instruction {

    public body: IR1Instruction[];

    public constructor(body?: IR1Instruction[]) {
        super();
        this.body = body ?? [];
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasm(SpiderOpcodes.loop, emitter.emitExpression(this.body));
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.openBlock("loop");
        ctx.writeInstructions(this.body);
        ctx.closeBlock();
    }
}
