import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { SpiderOpcodes } from "wasm-spider";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_abs = new class extends MathopIrInputOpType {
    public constructor() { super("operators_abs"); }

    protected _calculateConstant(input: number): number {
        return Math.abs(input);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.f64_abs);
    }
}

