import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdMotionSetXY extends IR0Command<["x", "y"]> {

    public constructor(x: IR0Input, y: IR0Input) {
        super("motion_set_xy", {
            x: {
                value: x,
                format: CatnipValueFormat.F64_NUMBER
            },
            y: {
                value: y,
                format: CatnipValueFormat.F64_NUMBER
            },
        });
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmRuntimeFunctionCall("catnip_target_set_xy");
        });
    }

    public clone(ctx: IR0CloneContext): IR0Command<["x", "y"]> {
        return new IR0CmdMotionSetXY(this.args.x.input.clone(ctx), this.args.y.input.clone(ctx));
    }

}