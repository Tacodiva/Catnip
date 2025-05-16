import { SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";

export const ir_return = new class extends CatnipIrCommandOpType<{}, {}> {
    public constructor() { super("core_return"); }

    public getOperandCount(): number { return 0; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<{}, {}>): void {
        ctx.emitWasm(SpiderOpcodes.return);
    }

    public doesContinue() { return false; }

    public isBarrier() { return true; }
}