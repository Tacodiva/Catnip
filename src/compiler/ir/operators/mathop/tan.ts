import { CatnipCompilerWasmGenContext } from "../../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp } from "../../../CatnipIrOp";
import { SpiderOpcodes } from "wasm-spider";
import { MathopIrInputOpType } from "./MathopIrInputOpType";

export const ir_tan = new class extends MathopIrInputOpType {
    public constructor() { super("operators_tan"); }

    protected _calculateConstant(input: number): number {
        input = input % 360;
        switch (input) {
            case -270:
            case 90:
                return Infinity;
            case -90:
            case 270:
                return -Infinity;
            default:
                return Math.round(Math.tan((Math.PI * input) / 180) * 1e10) / 1e10;
        }
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp): void {
        ctx.emitWasmRuntimeFunctionCall("catnip_math_tan");
    }
}

