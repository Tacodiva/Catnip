import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { IR0InputOperatorGenericBinary } from "./IR0InputOperatorGenericBinary";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";

export class IR0InputOperatorMod extends IR0InputOperatorGenericBinary {
    public constructor(left: IR0Input, right: IR0Input) {
        super("operator_mod", CatnipValueFormat.F64_NUMBER, left, right);
    }

    protected _getResult(left: CatnipValue, right: CatnipValue): CatnipValue {
        if (left.isConstant && right.isConstant)
            return CatnipValue.constantF64(left.asConstantNumber() % right.asConstantNumber());

        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            const modulus = emitter.borrowLocal(SpiderNumberType.f64);

            emitter.emitWasm(SpiderOpcodes.local_tee, modulus);
            emitter.emitWasmRuntimeFunctionCall("catnip_math_fmod");

            const result = emitter.borrowLocal(SpiderNumberType.f64);
            emitter.emitWasm(SpiderOpcodes.local_tee, result);

            emitter.emitWasm(SpiderOpcodes.local_get, modulus);

            // result / modulus
            emitter.emitWasm(SpiderOpcodes.f64_div);

            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);

            emitter.emitWasm(SpiderOpcodes.f64_lt);

            // if (result / modulus) < 0
            emitter.emitWasmIf(emitter => {
                emitter.emitWasm(SpiderOpcodes.local_get, result);
                emitter.emitWasm(SpiderOpcodes.local_get, modulus);
                emitter.emitWasm(SpiderOpcodes.f64_add);
                emitter.emitWasm(SpiderOpcodes.local_set, result);
            });

            emitter.emitWasm(SpiderOpcodes.local_get, result);

            emitter.returnLocal(modulus);
            emitter.returnLocal(result);
        });
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorMod(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }
}
