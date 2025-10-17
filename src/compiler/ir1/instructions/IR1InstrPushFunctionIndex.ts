import { SpiderNumberType } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction, IR1StringificationContext } from "../IR1";
import { IR1Function } from "../IR1Function";

export class IR1InstrPushFunctionIndex extends IR1Instruction {

    public func: IR1Function;

    public constructor(func: IR1Function) {
        super();
        this.func = func;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushNumber(SpiderNumberType.i32, 
            emitter.module.getFunctionTableIndex(emitter.conversionInfo.getSpiderFunction(this.func))
        );
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`push_func_idx ${ctx.getFunctionName(this.func)}`);
    }

}