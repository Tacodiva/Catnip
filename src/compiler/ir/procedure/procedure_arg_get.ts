
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../../compiler/CatnipIrTransientVariable";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";

export type ir_procedure_arg_get_inputs = { paramIndex: number };

export const ir_procedure_arg_get = new class extends CatnipIrInputOpType<ir_procedure_arg_get_inputs> {
    public constructor() { super("core_procedure_arg_get"); }

    public getOperandCount(): number { return 0; }

    public getResult(ir: CatnipIrInputOp<ir_procedure_arg_get_inputs>): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(ir.ir.parameters[ir.inputs.paramIndex].variable.format);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<ir_procedure_arg_get_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.local_get, ctx.getTransientVariableRef(ir.ir.parameters[ir.inputs.paramIndex].variable));
    }

    public *getTransientVariables(ir: CatnipIrOp<ir_procedure_arg_get_inputs, {}, CatnipIrOpType<ir_procedure_arg_get_inputs, {}>>): IterableIterator<CatnipIrTransientVariable> {
        yield ir.ir.parameters[ir.inputs.paramIndex].variable;
    }
}