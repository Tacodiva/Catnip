import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { SpiderOpcodes } from "wasm-spider";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_atan = new class extends MathopIrInputOpType {
    public constructor() { super("operators_atan"); }

    protected _calculateConsatant(input: number): number {
        return (Math.atan(input) * 180) / Math.PI;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_math_atan");
    }
}

