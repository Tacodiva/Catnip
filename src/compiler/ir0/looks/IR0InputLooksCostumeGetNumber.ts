import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";

export class IR0InputLooksCostumeGetNumber extends IR0Input<[]> {

    public constructor() {
        super("looks_costume_get_number", {});
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public clone(ctx: IR0CloneContext): IR0Input<[]> {
        return new IR0InputLooksCostumeGetNumber()
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
            emitter.emitWasm(SpiderOpcodes.i32_add);
        });
    }

}