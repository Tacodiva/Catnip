import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../../runtime/CatnipVariable";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipIrBranch } from "../../CatnipIrBranch";
import { CatnipIrInputOp, CatnipIrInputOpType } from "../../CatnipIrOp";
import { CatnipInputOpType } from "../../CatnipOp";
import { CatnipInputFormat, CatnipInputFlags } from "../../types";


type get_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID };

export const op_get_var = new class extends CatnipInputOpType<get_var_inputs> {
    
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: get_var_inputs, format: CatnipInputFormat, flags: CatnipInputFlags): CatnipIrInputOp<get_var_inputs, {}> {
        return ctx.emitIrInput(ir_get_value, inputs, format, flags, {});
    }
}

export const ir_get_value = new class extends CatnipIrInputOpType<get_var_inputs> {
    
    constructor() { super("data_get_value"); }
    
    public getOutputFormat(ir: CatnipIrInputOp<get_var_inputs>): CatnipInputFormat {
        return CatnipInputFormat.VALUE_PTR;
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<get_var_inputs, {}>, branch: CatnipIrBranch): void {
        const sprite = ctx.project.getSprite(ir.inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(ir.inputs.variable)!;
        const variableOffset = variable._index * CatnipWasmStructValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));
        ctx.emitWasmConst(SpiderNumberType.i32, variableOffset);
        ctx.emitWasm(SpiderOpcodes.i32_add);
    }
}

