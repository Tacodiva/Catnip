
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrValue } from "../../../compiler/CatnipIrValue";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";

export type ir_store_value_inputs = { value: CatnipIrValue, initialize: boolean };

export const ir_store_value = new class extends CatnipIrCommandOpType<ir_store_value_inputs> {
    public constructor() { super("core_store_value"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<ir_store_value_inputs, {}>): void {
        ctx.emitWasm(SpiderOpcodes.local_set, ctx.func.getValueVariableRef(ir.inputs.value));
    }

    public analyzePreEmit(ir: CatnipIrOpBase<ir_store_value_inputs, {}>, branch: CatnipIrBranch): void {
        if (ir.inputs.initialize) {
            branch.func.createLocalVariable(ir.inputs.value);
        } else {
            branch.func.useLocalVariable(ir.inputs.value);
        }
    }
}