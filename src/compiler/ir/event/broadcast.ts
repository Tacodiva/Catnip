
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipCompilerBroadcastSubsystem } from "../../subsystems/CatnipCompilerBroadcastSubsystem";
import { CatnipWasmPtrThread, CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";

export type ir_broadcast_inputs = { threadListVariable: CatnipIrTransientVariable | null };

export const ir_broadcast = new class extends CatnipIrCommandOpType<ir_broadcast_inputs> {
    public constructor() { super("event_broadcast"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<ir_broadcast_inputs>): void {
        const broadcastName = ctx.stack.peek();

        ctx.emitWasmGetThread();
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructThread.getMemberOffset("runtime"));

        if (ir.inputs.threadListVariable === null) {
            ctx.emitWasmConst(SpiderNumberType.i32, 0);
        } else {
            ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmPtrThread.size);
            ctx.emitWasmConst(SpiderNumberType.i32, 4);
            ctx.emitWasmRuntimeFunctionCall("catnip_list_new");
            
            ctx.emitWasm(SpiderOpcodes.local_tee, ctx.getTransientVariableRef(ir.inputs.threadListVariable));
        }

        if (broadcastName.isConstant) {
            ctx.emitWasm(
                SpiderOpcodes.call,
                ctx.compiler.getSubsystem(CatnipCompilerBroadcastSubsystem).getBroadcastFunction("" + broadcastName.value)
            );
        } else {
            ctx.emitWasm(
                SpiderOpcodes.call,
                ctx.compiler.getSubsystem(CatnipCompilerBroadcastSubsystem).getGenericBroadcastFunction()
            );
        }

    }

    public *getTransientVariables(ir: CatnipReadonlyIrOp<ir_broadcast_inputs>): IterableIterator<CatnipIrTransientVariable> {
        if (ir.inputs.threadListVariable !== null)
            return ir.inputs.threadListVariable;
    }

}