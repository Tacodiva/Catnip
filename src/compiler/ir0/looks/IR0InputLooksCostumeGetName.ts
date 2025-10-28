import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrSimple } from "../../ir1/core/IR1InstrSimple";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR1Instruction } from "../../ir1/IR1Instruction";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Input } from "../IR0Node";
import { CatnipWasmStructCostume } from "../../../wasm-interop/CatnipWasmStructCostume";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export class IR0InputLooksCostumeGetName extends IR0Input<[]> {

    public constructor() {
        super("looks_costume_get_name", {});
    }

    public getResult(): CatnipValue {
        return CatnipValue.dynamic(CatnipValueFormat.I32_HSTRING);
    }

    public clone(ctx: IR0CloneContext): IR0Input<[]> {
        return new IR0InputLooksCostumeGetName()
    }

    public emitIR1(emitter: IR1Emitter): IR1Instruction | IR1Instruction[] {
        return new IR1InstrSimple(this.name, emitter => {
            // Get the offset of the costume in the costumes array
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
            emitter.emitWasmPushNumber(SpiderNumberType.i32, CatnipWasmStructCostume.size);
            emitter.emitWasm(SpiderOpcodes.i32_mul);

            // We have the costume offset, now we need to get the costumes array

            // The costumes array pointer is a constant
            emitter.emitWasmPushNumber(SpiderNumberType.i32, emitter.sprite.structWrapper.getMember("costumes"));
            emitter.emitWasm(SpiderOpcodes.i32_add);

            // Okay we've got the pointer to the costume, load the name!
            emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructCostume.getMemberOffset("name"));

        });
    }

}