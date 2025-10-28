import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdSensingTimerReset extends IR0Command<[]> {

    public constructor() {
        super("sensing_timer_reset", {});
    }

    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdSensingTimerReset();
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => {
            // runtime->timer_start = runtime->time
            emitter.emitWasmPushRuntime();
            emitter.emitWasmPushRuntime();
            emitter.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("time"));
            emitter.emitWasm(SpiderOpcodes.i64_store, 3, CatnipWasmStructRuntime.getMemberOffset("timer_start"));
        });
    }

}