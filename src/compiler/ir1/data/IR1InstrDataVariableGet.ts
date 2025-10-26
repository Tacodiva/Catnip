import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export class IR1InstrDataVariableGet extends IR1Instruction {
    public readonly target: CatnipTarget | null;
    public readonly variable: CatnipVariable;

    public constructor(target: CatnipTarget | null, variable: CatnipVariable) {
        super();
        this.target = target;
        this.variable = variable;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        const variableOffset = this.variable.index * CatnipWasmUnionValue.size;

        if (this.target === null) {
            emitter.emitWasmPushCurrentTarget();
        } else {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, this.target.structWrapper.ptr);
        }
        
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        emitter.emitWasm(SpiderOpcodes.f64_load, 3, variableOffset);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_var_get '${this.variable.name}'`);
    }
}