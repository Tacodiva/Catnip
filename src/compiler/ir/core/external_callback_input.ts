import { SpiderImportFunction, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrInputOpType, CatnipIrOp, CatnipReadonlyIrInputOp, CatnipReadonlyIrOpBranches } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export type ir_external_callback_input_inputs = {
    name: string;
    callback: SpiderImportFunction;
    operandCount: number;
    resultFormat: CatnipValueFormat;
};

export const ir_external_callback_input = new class extends CatnipIrInputOpType<ir_external_callback_input_inputs> {
    public constructor() { super("core_external_callback_input"); }
    
    public getResult(ir: CatnipReadonlyIrInputOp<ir_external_callback_input_inputs>): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(ir.inputs.resultFormat);
    }

    public getOperandCount(inputs: ir_external_callback_input_inputs): number {
        return inputs.operandCount;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_external_callback_input_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.call, ir.inputs.callback);
    }

    public stringifyInputs(inputs: ir_external_callback_input_inputs): string {
        return `'${inputs.name}'`;
    }
}