
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrInputOp, CatnipIrInputOpType, CatnipIrOp, CatnipIrOpBranches } from "../../CatnipIrOp";
import { CatnipCompilerState } from "../../CatnipCompilerState";
import { CatnipCompilerValue } from "../../CatnipCompilerValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";

export type get_xy_ir_inputs = { axis: "x" | "y" };

export const ir_get_xy = new class extends CatnipIrInputOpType<get_xy_ir_inputs> {
    public constructor() { super("motion_get_xy"); }
    
    public getOperandCount(): number { return 0; }
    
    public getResult(ir: CatnipIrInputOp<get_xy_ir_inputs, CatnipIrOpBranches<{}>, this>, state?: CatnipCompilerState): CatnipCompilerValue {
        return CatnipCompilerValue.dynamic(CatnipValueFormat.F64_NUMBER);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<get_xy_ir_inputs, {}>): void {
        
        ctx.emitWasmGetCurrentTarget();

        let offset: number;

        if (ir.inputs.axis === "x") {
            offset = CatnipWasmStructTarget.getMemberOffset("position_x");
        } else {
            offset = CatnipWasmStructTarget.getMemberOffset("position_y");
        }
        
        ctx.emitWasm(SpiderOpcodes.f64_load, 3, offset);
    }
}