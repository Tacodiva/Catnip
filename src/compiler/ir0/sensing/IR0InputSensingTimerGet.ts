import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputSensingTimerGet extends IR0Input<[]> {

    public constructor() {
        super("sensing_timer_get", {});
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0InputSensingTimerGet();
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            emitter.emitWasmPushRuntime();
            emitter.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("time"));

            emitter.emitWasmPushRuntime();
            emitter.emitWasm(SpiderOpcodes.i64_load, 3, CatnipWasmStructRuntime.getMemberOffset("timer_start"));

            // time - timer_start
            emitter.emitWasm(SpiderOpcodes.i64_sub);

            // Convert to seconds by diving by 1000
            emitter.emitWasm(SpiderOpcodes.f64_convert_i64_u);
            emitter.emitWasmPushNumber(SpiderNumberType.f64, 1000);
            emitter.emitWasm(SpiderOpcodes.f64_div);
        });
    }

}