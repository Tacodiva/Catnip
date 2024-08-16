
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../../compiler/CatnipIrTransientVariable";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipCompilerValue, CatnipCompilerValueType } from "../../../compiler/CatnipCompilerStack";
import { CatnipValueFlags } from "../../types";

export type ir_transient_load_inputs = { variable: CatnipIrTransientVariable };

export const ir_transient_load = new class extends CatnipIrInputOpType<ir_transient_load_inputs> {
    public constructor() { super("core_transient_load"); }

    public getOperandCount(): number { return 0; }

    public getResult(inputs: ir_transient_load_inputs): CatnipCompilerValue {
        return { type: CatnipCompilerValueType.DYNAMIC, format: inputs.variable.format, flags: CatnipValueFlags.ANY };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<ir_transient_load_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.local_get, ctx.func.getTransientVariableRef(ir.inputs.variable));
    }
}