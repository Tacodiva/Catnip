import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdPenUp extends IR0Command<[]> {

    public constructor() {
        super("pen_up", {});
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
            emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_down"));
        });
    }
    
    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdPenUp();
    }
}