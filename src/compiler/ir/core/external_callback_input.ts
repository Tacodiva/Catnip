import { SpiderImportFunction, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrInputOpType, CatnipIrOp, CatnipReadonlyIrOpBranches } from "../../CatnipIrOp";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../../CatnipCompilerStack";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export type ir_external_callback_input_inputs = {
    name: string;
    callback: SpiderImportFunction;
    operandCount: number;
    resultFormat: CatnipValueFormat;
};

export const ir_external_callback_input = new class extends CatnipIrInputOpType<ir_external_callback_input_inputs> {
    public constructor() { super("core_external_callback_input"); }
    
    public getResult(inputs: ir_external_callback_input_inputs, branches: CatnipReadonlyIrOpBranches<{}>, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue {
        return { format: inputs.resultFormat, isConstant: false };
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