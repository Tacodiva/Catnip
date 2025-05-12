
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";

export type ir_transient_tee_inputs = { transient: CatnipIrTransientVariable };

export const ir_transient_tee = new class extends CatnipIrInputOpType<ir_transient_tee_inputs> {
    public constructor() { super("core_transient_tee"); }

    public getOperandCount(): number { return 1; }

    public getResult(ir: CatnipIrInputOp<ir_transient_tee_inputs>): CatnipCompilerValue {
        return ir.operands[0];
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<ir_transient_tee_inputs>): void {
        ctx.emitWasm(SpiderOpcodes.local_tee, ctx.getTransientVariableRef(ir.inputs.transient));
    }

    public *getTransientVariables(ir: CatnipIrOp<ir_transient_tee_inputs, {}, CatnipIrOpType<ir_transient_tee_inputs, {}>>): IterableIterator<CatnipIrTransientVariable> {
        yield ir.inputs.transient;
    }
}