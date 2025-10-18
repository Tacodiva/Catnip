import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { IR1Function } from "../IR1Function";


export class IR1InstrCall extends IR1Instruction {

    public func: IR1Function;

    public constructor(func: IR1Function) {
        super();
        this.func = func;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushThread();
        emitter.emitWasm(SpiderOpcodes.call, emitter.conversionInfo.getSpiderFunction(this.func));
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`call ${ctx.getFunctionName(this.func)}`);
    }
}
