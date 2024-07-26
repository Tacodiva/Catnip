import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrCommandOp, CatnipIrCommandOpType, CatnipIrOpBase } from "../../CatnipIrOp";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipCommandOpType } from "../../CatnipOp";
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";

export const op_yield = new class extends CatnipCommandOpType<{}> {
    public generateIr(ctx: CatnipCompilerIrGenContext): void {
        ctx.emitYield();
    }
}

type yield_ir_inptus = { status: CatnipWasmEnumThreadStatus, continue?: boolean };
type yield_ir_branches = { branch: CatnipIrBranch };

export const ir_yield = new class extends CatnipIrCommandOpType<yield_ir_inptus, yield_ir_branches> {
    public constructor() { super("core_yield"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<yield_ir_inptus, yield_ir_branches>): void {
        CatnipCompilerWasmGenContext.logger.assert(
            ir.branches.branch.isFuncBody,
            true, "Yield branch must be a function body."
        );

        const targetFunc = ir.branches.branch.func;

        CatnipCompilerWasmGenContext.logger.assert(
            targetFunc.needsFunctionTableIndex,
            true, "Yield branch function must have a function table index."
        );

        CatnipCompilerWasmGenContext.logger.assert(
            targetFunc.parameters.length === 0,
            false, "Cannot yield to a function with parameters."
        );


        ctx.prepareStackForCall(targetFunc, true);

        // if (ir.inputs.status === CatnipWasmEnumThreadStatus.RUNNING) {
        // TODO use a return call insteasd
        // }

        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, ir.inputs.status);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("status"));

        ctx.emitWasmGetThread();
        ctx.emitWasmConst(SpiderNumberType.i32, targetFunc.functionTableIndex);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("function"));

        ctx.emitWasm(SpiderOpcodes.return);
    }

    public isYielding(): boolean {
        return true;
    }

    public doesBranchContinue(branch: "branch", ir: CatnipIrOpBase<yield_ir_inptus, yield_ir_branches>): boolean {
        if (ir.inputs.continue === undefined) return true;
        return ir.inputs.continue;
    }
}