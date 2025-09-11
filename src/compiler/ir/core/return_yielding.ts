import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType } from "../../CatnipIrOp";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";

export const ir_return_yielding = new class extends CatnipIrCommandOpType<{}, {}> {
    public constructor() { super("core_return_yielding"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, {}>): void {
        // CatnipCompilerLogger.asserts(ctx.func.ir.)
        
        const returnLocation = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_set, returnLocation.ref);

        ctx.emitWasmGetThread();
        ctx.emitWasm(SpiderOpcodes.local_get, returnLocation.ref);

        if (ctx.compiler.config.enable_tail_call) {

            ctx.cleanStack();
            ctx.emitWasm(
                SpiderOpcodes.return_call_indirect,
                ctx.compiler.spiderIndirectFunctionType,
                ctx.compiler.spiderIndirectFunctionTable
            );

        } else {

            ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("function"));    
            ctx.cleanStack();
            ctx.emitWasm(SpiderOpcodes.return);
    
        }
        
        ctx.releaseLocal(returnLocation);
    }

    public isYielding() { return true; }

    public doesReturn(): boolean { return true; }

    public isBarrier() { return true; }
}