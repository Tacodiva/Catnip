import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { IR1InstrCallback } from "../../ir1/core/IR1InstrCallback";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdPenClear extends IR0Command<[]> {

    public constructor() {
        super("pen_clear", {});
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitIR1([
            // TODO Check this doesn't import a different function every time
            new IR1InstrCallback("pen_clear_renderer", () => emitter.compiler.runtimeModule.renderer.penEraseAll(), [], null),

            new IR1InstrSimple("pen_clear_buffer", emitter => {
                emitter.emitWasmPushRuntime();
                emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
                emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructRuntime.getMemberOffset("pen_line_buffer_length"));
            })
        ]);
    }

    public clone(ctx: IR0CloneContext): IR0Command<[]> {
        return new IR0CmdPenClear();
    }

}