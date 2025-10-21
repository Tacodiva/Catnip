import { Cast } from "../../cast";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";


export class IR0InputOperatorCmpEq extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_cmp_eq", CatnipValueFormat.F64, left, right);
    }

    protected _getResult(left: CatnipValue, right: CatnipValue): CatnipValue {
        if (left.isConstant && right.isConstant)
            return CatnipValue.constant(Cast.compare(left.asConstantString(), right.asConstantString()) === 0, CatnipValueFormat.I32_BOOLEAN);

        return CatnipValue.dynamic(CatnipValueFormat.I32_BOOLEAN);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            emitter.emitWasmPushRuntime();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_value_eq");
        });
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorCmpEq(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }

}
