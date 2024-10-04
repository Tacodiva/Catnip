import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType } from "../../CatnipIrOp";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { CatnipIrBasicBlock } from "../../CatnipIrBasicBlock";
import { CatnipIrExternalLocationType } from "../../CatnipIrFunction";
import { CatnipIrBranch } from "../../CatnipIrBranch";

export type yield_ir_inptus = { status: CatnipWasmEnumThreadStatus };
export type yield_ir_branches = { branch: CatnipIrBranch };

export const ir_yield = new class extends CatnipIrCommandOpType<yield_ir_inptus, yield_ir_branches> {
    public constructor() { super("core_yield"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<yield_ir_inptus, yield_ir_branches>): void {
        CatnipCompilerWasmGenContext.logger.assert(
            ir.branches.branch.body.isFuncBody,
            true, "Yield branch must be a function body."
        );

        const targetFunc = ir.branches.branch.body.func;

        if (ir.inputs.status === CatnipWasmEnumThreadStatus.RUNNING && ctx.compiler.config.enable_tail_call) {
            ctx.emitBranchInline(ir.branches.branch, true);
            return;
        }
        
        CatnipCompilerWasmGenContext.logger.assert(
            targetFunc.parameters.length === 0,
            false, "Cannot yield to a function with parameters."
        );

        CatnipCompilerWasmGenContext.logger.assert(
            targetFunc.hasFunctionTableIndex,
            true, "Non-tail-call yield branch function must have a function table index."
        );

        ctx.prepareStackForCall(ir.branches.branch, true);

        if (ir.inputs.status !== CatnipWasmEnumThreadStatus.RUNNING) {
            ctx.emitWasmGetThread();
            ctx.emitWasmConst(SpiderNumberType.i32, ir.inputs.status);
            ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));
        }

        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, targetFunc.functionTableIndex);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("function"));

        ctx.emitWasm(SpiderOpcodes.return);
    }

    public isYielding() { return true; }
    
    public doesContinue() {return false; }

    public isBarrier() { return true; }
}