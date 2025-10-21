import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";

export class IR0CmdRequestRedraw extends IR0Command<[]> {
    public constructor() {
        super("request_redraw", {});
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction {
        return new IR1InstrSimple("request_redraw", emitter => {
            // Set redraw requested to 1.
            emitter.emitWasmPushRuntime();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
            emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructRuntime.getMemberOffset("redraw_requested"));
        });
    }

    public clone(ctx: IR0CloneContext): IR0Command<[]> {
        return new IR0CmdRequestRedraw();
    }

}