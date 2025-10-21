import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export class IR0CmdPenSetColor extends IR0Command<["color"]> {

    public constructor(color: IR0Input) {
        super("pen_set_color", { color: { value: color, format: CatnipValueFormat.I32_COLOR } })
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => {
            const local = emitter.borrowLocal(SpiderNumberType.i32);

            // Set ARGB
            emitter.emitWasm(SpiderOpcodes.local_set, local);
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasm(SpiderOpcodes.local_get, local);
            emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb"));

            // Mark THSV as invalid
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
            emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_thsv_valid"));
            
            // Mark RGB as valid
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
            emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb_valid"));
            
            emitter.returnLocal(local);
        });
    }

    public clone(ctx: IR0CloneContext): IR0Command<["color"]> {
        return new IR0CmdPenSetColor(this.args.color.input.clone(ctx));
    }

}