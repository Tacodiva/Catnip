
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../../compiler/CatnipIrTransientVariable";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../../compiler/CatnipCompilerStack";

export type ir_transient_load_inputs = { transient: CatnipIrTransientVariable };

export const ir_transient_load = new class extends CatnipIrInputOpType<ir_transient_load_inputs> {
    public constructor() { super("core_transient_load"); }

    public getOperandCount(): number { return 0; }

    public getResult(inputs: ir_transient_load_inputs): CatnipCompilerValue {
        return { isConstant: false, format: inputs.transient.format };
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<ir_transient_load_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.local_get, ctx.getTransientVariableRef(ir.inputs.transient));
    }

    public *getTransientVariables(ir: CatnipReadonlyIrOp<ir_transient_load_inputs, {}, CatnipIrOpType<ir_transient_load_inputs, {}>>): IterableIterator<CatnipIrTransientVariable> {
        yield ir.inputs.transient;
    }
}