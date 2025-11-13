import { IR1Emitter } from "../../../ir1/IR1Emitter";
import { IR0CloneContext } from "../../IR0CloneContext";
import { IR0Input } from "../../IR0Node";
import { IR0InputOperatorGenericMathop } from "./IR0InputOperatorGenericMathop";

export class IR0InputOperatorLn extends IR0InputOperatorGenericMathop {
    public constructor(input: IR0Input) {
        super("operator_ln", input);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => emitter.emitWasmRuntimeFunctionCall("catnip_math_log", true));
    }

    public clone(ctx: IR0CloneContext): IR0Input<["operand"]> {
        return new IR0InputOperatorLn(this.args.operand.input.clone(ctx));
    }
}