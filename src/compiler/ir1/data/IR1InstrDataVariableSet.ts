import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export class IR1InstrDataVariableSet extends IR1Instruction {
    public readonly target: CatnipTarget | null;
    public readonly variable: CatnipVariable;

    public constructor(target: CatnipTarget | null, variable: CatnipVariable) {
        super();
        this.target = target;
        this.variable = variable;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        const valueLocal = emitter.borrowLocal(CatnipValueFormat.F64);
        emitter.emitWasm(SpiderOpcodes.local_set, valueLocal);

        const variableOffset = this.variable.index * CatnipWasmUnionValue.size;

        if (this.target === null) {
            emitter.emitWasmPushCurrentTarget();
        } else {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, this.target.structWrapper.ptr);
        }

        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));

        emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);
        emitter.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset);

        emitter.returnLocal(valueLocal);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_var_set '${this.variable.name}'`);
    }
}