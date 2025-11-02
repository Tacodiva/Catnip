import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";


export class IR0InputOperatorJoin extends IR0InputOperatorGenericBinary {

    public canTriggerGC: boolean = true;
    
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_join", CatnipValueFormat.I32_HSTRING, left, right);
    }
    
    protected _getResult(left: CatnipValue, right: CatnipValue): CatnipValue {
        if (left.isConstant && right.isConstant) {
            return CatnipValue.constant(left.asConstantString() + right.asConstantString(), CatnipValueFormat.I32_HSTRING);
        }
    
        return CatnipValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            emitter.emitWasmPushRuntime();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_join_gc");
        });
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorJoin(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }
}
