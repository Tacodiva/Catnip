
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipCompilerState } from "../../CatnipCompilerState";

export type set_var_ir_inputs = { target: CatnipTarget, variable: CatnipVariable };

export const ir_set_var = new class extends CatnipIrCommandOpType<set_var_ir_inputs> {
    public constructor() { super("data_set_var"); }

    public getOperandCount(): number { return 1; }

    public applyState(ir: CatnipIrOp<set_var_ir_inputs>, state: CatnipCompilerState): void {
        state.setVariableValue(ir.inputs.variable, ir.operands[0]);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<set_var_ir_inputs>): void {

        const valueLocal = ctx.createLocal(SpiderNumberType.f64);

        ctx.emitWasm(SpiderOpcodes.local_set, valueLocal.ref);

        const target = ir.inputs.target;
        const variable = ir.inputs.variable;
        const variableOffset = variable.index * CatnipWasmUnionValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        
        ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
        ctx.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset);

        ctx.releaseLocal(valueLocal);
    }
}