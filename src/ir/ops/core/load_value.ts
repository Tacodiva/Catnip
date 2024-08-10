
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrVariable } from "../../../compiler/CatnipIrVariable";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOpBase } from "../../CatnipIrOp";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFlags } from "../../types";

export type ir_load_value_inputs = { value: CatnipIrVariable };

export const ir_load_value = new class extends CatnipIrInputOpType<ir_load_value_inputs> {
    public constructor() { super("core_load_value"); }

    public getOperandCount(): number { return 0; }

    public getResult(inputs: ir_load_value_inputs): CatnipCompilerValue {
        return { type: CatnipCompilerValueType.DYNAMIC, format: inputs.value.format, flags: CatnipValueFlags.ANY };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<ir_load_value_inputs, {}>): void {
        ctx.emitWasm(SpiderOpcodes.local_get, ctx.func.getValueVariableRef(ir.inputs.value));
    }

    public analyzePreEmit(ir: CatnipIrOpBase<ir_load_value_inputs, {}>, branch: CatnipIrBranch): void {
        branch.func.useLocalVariable(ir.inputs.value);
    }
}