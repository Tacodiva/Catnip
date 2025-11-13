import { SpiderOpcodes } from "wasm-spider";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";

export class IR0InputOperatorSub extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_sub", CatnipValueFormat.F64_NUMBER, left, right);
    }

    protected _getResult(left: CatnipValue, right: CatnipValue): CatnipValue {
        if (left.isConstant && right.isConstant)
            return CatnipValue.constantF64(left.asConstantNumber() - right.asConstantNumber());

        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }


    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => emitter.emitWasm(SpiderOpcodes.f64_sub));
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorSub(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }
}
