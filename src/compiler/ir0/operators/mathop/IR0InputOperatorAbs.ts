import { SpiderOpcodes } from "wasm-spider";
import { IR1InstrSimple } from "../../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../../ir1/IR1Emitter";
import { IR1Instruction } from "../../../ir1/IR1Instruction";
import { IR0CloneContext } from "../../IR0CloneContext";
import { IR0Input } from "../../IR0Node";
import { IR0InputOperatorGenericMathop } from "./IR0InputOperatorGenericMathop";

export class IR0InputOperatorAbs extends IR0InputOperatorGenericMathop {
    public constructor(input: IR0Input) {
        super("operator_abs", input);
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => emitter.emitWasm(SpiderOpcodes.f64_abs));
    }

    public clone(ctx: IR0CloneContext): IR0Input<["operand"]> {
        return new IR0InputOperatorAbs(this.args.operand.input.clone(ctx));
    }
}