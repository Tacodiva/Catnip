import { SpiderOpcodes } from "wasm-spider";
import { IR1Emitter } from "../../../ir1/IR1Emitter";
import { IR0CloneContext } from "../../IR0CloneContext";
import { IR0Input } from "../../IR0Node";
import { IR0InputOperatorGenericMathop } from "./IR0InputOperatorGenericMathop";

export class IR0InputOperatorSqrt extends IR0InputOperatorGenericMathop {
    public constructor(input: IR0Input) {
        super("operator_sqrt", input);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => emitter.emitWasm(SpiderOpcodes.f64_sqrt));
    }

    public clone(ctx: IR0CloneContext): IR0Input<["operand"]> {
        return new IR0InputOperatorSqrt(this.args.operand.input.clone(ctx));
    }
}