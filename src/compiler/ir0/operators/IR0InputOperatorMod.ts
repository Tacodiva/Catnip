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
            return CatnipValue.constantF64(left.asConstantNumber() % right.asConstantNumber()); // TODO This is wrong

        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER_OR_NAN);
    }

    public emitIR1(emitter: IR1Emitter) {
        return new IR1InstrSimple(this.name, emitter => {
            const value = emitter.borrowLocal(CatnipValueFormat.F64_NUMBER);
            const valueCast = emitter.borrowLocal(CatnipValueFormat.I32_NUMBER);
            const modulus = emitter.borrowLocal(CatnipValueFormat.F64_NUMBER);

            emitter.emitWasm(SpiderOpcodes.local_set, modulus);
            emitter.emitWasm(SpiderOpcodes.local_set, value);
            
            emitter.emitWasmBlock(emitter => {

                emitter.emitWasm(SpiderOpcodes.local_get, value);
                emitter.emitWasm(SpiderOpcodes.i32_trunc_sat_f64_u);
                emitter.emitWasm(SpiderOpcodes.local_tee, valueCast);
                emitter.emitWasm(SpiderOpcodes.f64_convert_i32_u);
                emitter.emitWasm(SpiderOpcodes.local_get, value);
                emitter.emitWasm(SpiderOpcodes.f64_eq);

                emitter.emitWasmIf(
                    emitter => {
                        const modulusCast = emitter.borrowLocal(CatnipValueFormat.I32_NUMBER);

                        emitter.emitWasm(SpiderOpcodes.local_get, modulus);
                        emitter.emitWasm(SpiderOpcodes.i32_trunc_sat_f64_u);
                        emitter.emitWasm(SpiderOpcodes.local_tee, modulusCast);
                        emitter.emitWasm(SpiderOpcodes.f64_convert_i32_u);
                        emitter.emitWasm(SpiderOpcodes.local_get, modulus);
                        emitter.emitWasm(SpiderOpcodes.f64_eq);

                        emitter.emitWasmIf(emitter => {

                            // Both operands are positive integers. Fast path :3
                            emitter.emitWasm(SpiderOpcodes.local_get, valueCast);
                            emitter.emitWasm(SpiderOpcodes.local_get, modulusCast);
                            emitter.emitWasm(SpiderOpcodes.i32_rem_u);
                            emitter.emitWasm(SpiderOpcodes.f64_convert_i32_u);

                            emitter.emitWasm(SpiderOpcodes.br, 2); // Skip to end of block
                        });

                        emitter.returnLocal(modulusCast);
                    }
                );

                emitter.emitWasm(SpiderOpcodes.local_get, value);
                emitter.emitWasm(SpiderOpcodes.local_get, modulus);

                emitter.emitWasmRuntimeFunctionCall("catnip_math_fmod", true);

                const result = emitter.borrowLocal(CatnipValueFormat.F64_NUMBER_OR_NAN);
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

                emitter.returnLocal(result);

            }, SpiderNumberType.f64);

            emitter.returnLocal(value);
            emitter.returnLocal(valueCast);
            emitter.returnLocal(modulus);
        });
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputOperatorMod(this.args.left.input.clone(ctx), this.args.right.input.clone(ctx));
    }
}
