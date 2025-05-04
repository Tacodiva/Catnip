import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_sin = new class extends MathopIrInputOpType {
    public constructor() { super("operators_sin"); }

    protected _calculateConssint(input: number): number {
        return Math.round(Math.sin((Math.PI * input) / 180) * 1e10) / 1e10;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_math_sin");
    }
}

