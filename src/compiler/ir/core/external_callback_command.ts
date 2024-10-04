import { SpiderImportFunction, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export type ir_external_callback_command_inputs = {
    name: string;
    callback: SpiderImportFunction;
    operandCount: number;
};

export const ir_external_callback_command = new class extends CatnipIrCommandOpType<ir_external_callback_command_inputs> {
    public constructor() { super("core_external_callback_command"); }

    public getOperandCount(inputs: ir_external_callback_command_inputs): number {
        return inputs.operandCount;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_external_callback_command_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.call, ir.inputs.callback);
    }

    public stringifyInputs(inputs: ir_external_callback_command_inputs): string {
        return `'${inputs.name}'`;
    }
}