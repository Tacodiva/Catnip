
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrValue } from "../../../compiler/CatnipIrValue";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";

export type ir_load_value_inputs = { value: CatnipIrValue };

export const ir_load_value = new class extends CatnipIrCommandOpType<ir_load_value_inputs> {
    public constructor() { super("core_load_value"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<ir_load_value_inputs, {}>): void {
        ctx.emitWasm(SpiderOpcodes.local_get, ctx.func.getValueVariableRef(ir.inputs.value));
    }

    public analyzePreEmit(ir: CatnipIrOpBase<ir_load_value_inputs, {}>, branch: CatnipIrBranch): void {
        branch.func.useLocalVariable(ir.inputs.value);
    }
}