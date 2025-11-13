import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command } from "../IR0Node";

export class IR0CmdPenDown extends IR0Command<[]> {

    public constructor() {
        super("pen_down", {});
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_pen_down");
        });
    }

    public clone(ctx: IR0CloneContext): IR0Command<string[]> {
        return new IR0CmdPenDown();
    }
}