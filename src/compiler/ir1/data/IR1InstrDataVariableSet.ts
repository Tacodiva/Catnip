import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrDataVariableSet extends IR1Instruction {
    public readonly target: CatnipTarget;
    public readonly variable: CatnipVariable;

    public constructor(target: CatnipTarget, variable: CatnipVariable) {
        super();
        this.target = target;
        this.variable = variable;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        const variable = this.variable;
        const target = this.target;

        const variableOffset = variable.index * CatnipWasmUnionValue.size;

        emitter.emitWasmPushNumber(SpiderNumberType.i32, target.structWrapper.ptr);
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        emitter.emitWasm(SpiderOpcodes.f64_load, 3, variableOffset);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`data_var_set '${this.variable.name}'`);
    }
}