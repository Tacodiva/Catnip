import { Cast } from "../../cast";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1InstrOperatorCmpLtGt, IR1InstrOperatorCmpLtGtType } from "../../ir1/operators/IR1InstrOperatorCmpLtGt";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";


export class IR0InputOperatorCmpLt extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_cmp_lt", CatnipValueFormat.F64, left, right);
    }

    protected _getResult(left: CatnipValue, right: CatnipValue): CatnipValue {
        if (left.isConstant && right.isConstant)
            return CatnipValue.constant(Cast.compare(left.asConstantString(), right.asConstantString()) < 0, CatnipValueFormat.I32_BOOLEAN);
    
        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitInput(this.args.left);
        emitter.emitInput(this.args.right);
        emitter.emitIR1(new IR1InstrOperatorCmpLtGt(
            IR1InstrOperatorCmpLtGtType.LESS_THAN,
            this.args.left.getResult().format,
            this.args.right.getResult().format
        ));
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorCmpLt(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }

}
