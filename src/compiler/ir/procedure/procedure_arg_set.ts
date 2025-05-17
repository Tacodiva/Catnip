
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipIr } from "../../CatnipIr";

export type ir_procedure_arg_set_inputs = { target: CatnipIr, argIdx: number }

export const ir_procedure_arg_set = new class extends CatnipIrCommandOpType<ir_procedure_arg_set_inputs> {
    public constructor() { super("procedure_arg_set"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_procedure_arg_set_inputs>): void {
        const local = ctx.createParameterLocal(ir.inputs.target, ir.inputs.argIdx);
        ctx.emitWasm(SpiderOpcodes.local_set, local.ref);
    }
}