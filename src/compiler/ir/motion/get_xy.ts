
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOpType, CatnipIrOp, CatnipIrOpBranches, CatnipReadonlyIrInputOp } from "../../CatnipIrOp";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export type get_xy_ir_inputs = { axis: "x" | "y" };

export const ir_get_xy = new class extends CatnipIrInputOpType<get_xy_ir_inputs> {
    public constructor() { super("motion_get_xy"); }
    
    public getOperandCount(): number { return 0; }
    
    public getResult(ir: CatnipReadonlyIrInputOp<get_xy_ir_inputs, CatnipIrOpBranches<{}>, this>, state?: CatnipCompilerState): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.I32_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<get_xy_ir_inputs, {}>): void {
        
        ctx.emitWasmGetCurrentTarget();

        let offset: number;

        if (ir.inputs.axis === "x") {
            offset = CatnipWasmStructTarget.getMemberOffset("position_x");
        } else {
            offset = CatnipWasmStructTarget.getMemberOffset("position_y");
        }
        
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, offset);
    }
}