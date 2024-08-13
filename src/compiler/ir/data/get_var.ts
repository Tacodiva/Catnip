import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFlags, CatnipValueFormat } from "../../types";
import { CatnipIrBranch } from "../../CatnipIrBranch";

export type get_var_ir_inputs = { target: CatnipTarget, variable: CatnipVariable };

export const ir_get_var = new class extends CatnipIrInputOpType<get_var_ir_inputs> {

    constructor() { super("data_get_value"); }

    public getOperandCount(): number { return 0; }

    public getResult(): CatnipCompilerValue {
        return {type: CatnipCompilerValueType.DYNAMIC, format: CatnipValueFormat.VALUE_PTR, flags: CatnipValueFlags.ANY};
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_var_ir_inputs>, branch: CatnipIrBranch): void {
        const variable = ir.inputs.variable;
        const target = ir.inputs.target;
        
        const variableOffset = variable._index * CatnipWasmStructValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        ctx.emitWasmConst(SpiderNumberType.i32, variableOffset);
        ctx.emitWasm(SpiderOpcodes.i32_add);
    }
}

