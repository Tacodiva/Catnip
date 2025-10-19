import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";


export class IR1InstrOperatorCmpGt extends IR1Instruction {
    public constructor() {
        super();
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        // TODO Optimize!!!
        
        emitter.emitWasmPushRuntime();
        emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
        emitter.emitWasm(SpiderOpcodes.i32_gt_s);

    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`operator_cmp_gt`);
    }
}
