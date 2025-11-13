import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdRequestRedraw extends IR0Command<[]> {
    public constructor() {
        super("request_redraw", {});
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
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