import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction, IR1StringificationContext } from "../IR1";
import { IR1Function } from "../IR1Function";


export class IR1InstrYield extends IR1Instruction {

    public func: IR1Function;
    public status: CatnipWasmEnumThreadStatus;

    public constructor(func: IR1Function, status: CatnipWasmEnumThreadStatus) {
        super();
        this.func = func;
        this.status = status;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushThread();
        emitter.emitWasmPushNumber(SpiderNumberType.i32, this.status);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        emitter.emitWasmPushThread();
        emitter.emitWasmPushNumber(SpiderNumberType.i32,
            emitter.module.getFunctionTableIndex(emitter.conversionInfo.getSpiderFunction(this.func))
        );
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("function"));

        emitter.emitWasm(SpiderOpcodes.return);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`yield ${ctx.getFunctionName(this.func)} status = ${this.status}`);
    }

}
