import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { SpiderOpcodes } from "wasm-spider";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_cos = new class extends MathopIrInputOpType {
    public constructor() { super("operators_cos"); }

    protected _calculateConscost(input: number): number {
        return Math.round(Math.cos((Math.PI * input) / 180) * 1e10) / 1e10;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_math_cos");
    }
}

