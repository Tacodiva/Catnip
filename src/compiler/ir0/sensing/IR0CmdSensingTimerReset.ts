import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdSensingTimerReset extends IR0Command<[]> {

    public constructor() {
        super("sensing_timer_reset", {});
    }

    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdSensingTimerReset();
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            // runtime->timer_start = runtime->time
            emitter.emitWasmPushRuntime();
            emitter.emitWasmPushRuntime();
            emitter.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("time"));
            emitter.emitWasm(SpiderOpcodes.i64_store, 3, CatnipWasmStructRuntime.getMemberOffset("timer_start"));
        });
    }

}