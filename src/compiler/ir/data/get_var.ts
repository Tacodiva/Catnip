import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipVariable } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipTarget } from '../../../runtime/CatnipTarget';
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipCompilerState } from "../../CatnipCompilerState";

export type get_var_ir_inputs = { target: CatnipTarget, variable: CatnipVariable };

export const ir_get_var = new class extends CatnipIrInputOpType<get_var_ir_inputs> {
    constructor() { super("data_get_var"); }

    public getOperandCount(): number { return 0; }

    public getResult(ir: CatnipReadonlyIrInputOp<get_var_ir_inputs>, state?: CatnipCompilerState): CatnipCompilerValue {
        if (state === undefined) return CatnipCompilerValue.dynamic(CatnipValueFormat.F64);
        return state.getVariableValue(ir.inputs.variable);
    }    

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_var_ir_inputs>, branch: CatnipIrBasicBlock): void {
        const variable = ir.inputs.variable;
        const target = ir.inputs.target;
        
        const variableOffset = variable._index * CatnipWasmUnionValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        ctx.emitWasm(SpiderOpcodes.f64_load, 3, variableOffset);
    }

}

