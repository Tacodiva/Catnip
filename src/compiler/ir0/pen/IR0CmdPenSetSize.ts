import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1Emitter } from "../../ir1/IR1Emitter";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0Command, IR0Input } from "../IR0Node";

export class IR0CmdPenSetSize extends IR0Command<["size"]> {

    public constructor(size: IR0Input) {
        super("pen_set_size", { size: { value: size, format: CatnipValueFormat.F64_NUMBER_OR_NAN } })
    }

    public emitIR1(emitter: IR1Emitter): void {
        emitter.emitSimpleIR1(this, emitter => {
            const local = emitter.borrowLocal(CatnipValueFormat.F64_NUMBER_OR_NAN);
            emitter.emitWasm(SpiderOpcodes.local_set, local);
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasm(SpiderOpcodes.local_get, local);
            emitter.emitWasm(SpiderOpcodes.f32_demote_f64);
            emitter.emitWasm(SpiderOpcodes.f32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_thickness"));
            emitter.returnLocal(local);
        });
    }

    public clone(ctx: IR0CloneContext) {
        return new IR0CmdPenSetSize(this.args.size.input.clone(ctx));
    }

}