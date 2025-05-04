import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { SpiderOpcodes } from "wasm-spider";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_ceil = new class extends MathopIrInputOpType {
    public constructor() { super("operators_ceil"); }

    protected _calculateConstant(input: number): number {
        return Math.ceil(input);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasm(SpiderOpcodes.f64_ceil);
    }
}

