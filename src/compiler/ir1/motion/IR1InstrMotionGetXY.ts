import { SpiderOpcodes } from "wasm-spider";
import { IR0MotionAxis } from "../../ir0/motion/IR0InputMotionGetXY";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export class IR1InstrMotionGetXY extends IR1Instruction {
    public axis: IR0MotionAxis;

    public constructor(axis: IR0MotionAxis) {
        super();
        this.axis = axis;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        emitter.emitWasmPushCurrentTarget();

        let offset: number;

        if (this.axis === "x") {
            offset = CatnipWasmStructTarget.getMemberOffset("position_x");
        } else {
            offset = CatnipWasmStructTarget.getMemberOffset("position_y");
        }

        emitter.emitWasm(SpiderOpcodes.f64_load, 3, offset);

    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`motion_get_xy axis='${this.axis}'`);
    }
}