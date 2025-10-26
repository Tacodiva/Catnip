import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR1InstrMotionGetXY } from "../../ir1/motion/IR1InstrMotionGetXY";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export type IR0MotionAxis = "x" | "y";

export class IR0InputMotionGetXY extends IR0Input<[]> {

    public axis: IR0MotionAxis;

    public constructor(axis: IR0MotionAxis) {
        super("motion_get_xy", {});
        this.axis = axis;
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public clone(ctx: IR0CloneContext): IR0Input<string[]> {
        return new IR0InputMotionGetXY(this.axis);
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrMotionGetXY(this.axis);
    }

    public getGraphVisNodeProperties(): string {
        return `[label="${this.name} axis='${this.axis}'"]`;
    }
}