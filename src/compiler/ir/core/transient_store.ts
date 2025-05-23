
import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../../compiler/CatnipIrTransientVariable";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType } from "../../CatnipIrOp";

export type ir_transient_store_inputs = { transient: CatnipIrTransientVariable };

export const ir_transient_store = new class extends CatnipIrCommandOpType<ir_transient_store_inputs> {
    public constructor() { super("core_transient_store"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_transient_store_inputs, {}>): void {
        ctx.emitWasm(SpiderOpcodes.local_set, ctx.getTransientVariableRef(ir.inputs.transient));
    }

    public *getTransientVariables(ir: CatnipIrOp<ir_transient_store_inputs, {}, CatnipIrOpType<ir_transient_store_inputs, {}>>): IterableIterator<CatnipIrTransientVariable> {
        yield ir.inputs.transient;
    }
}