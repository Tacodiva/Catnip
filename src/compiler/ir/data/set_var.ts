
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipVariable, CatnipVariableID } from "../../../runtime/CatnipVariable";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmUnionValue, VALUE_STRING_MASK, VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValueFormat, getValueFormatSpiderType } from "../../types";
import { CatnipRuntimeModule } from "../../../runtime/CatnipRuntimeModule";

export type set_var_ir_inputs = { target: CatnipTarget, variable: CatnipVariable, format: CatnipValueFormat };

export const ir_set_var = new class extends CatnipIrCommandOpType<set_var_ir_inputs> {
    public constructor() { super("data_set_var"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<set_var_ir_inputs>): void {

        const valueLocal = ctx.createLocal(getValueFormatSpiderType(ir.inputs.format));

        ctx.emitWasm(SpiderOpcodes.local_set, valueLocal.ref);

        // TODO 1 check to see if the old value of the variable has a string that needs releasing.
        // TODO 2 Also this can eventually only happen if we know from type analysis the variable could be a string.
        // TODO 3 When we set a variable, we should put its value in a local instead then update the actual
        //    variable at the end of the function. This would optimize the same variable being written / read
        //    in the same func, but can only happen if all reads / write are in the same format.

        const target = ir.inputs.target;
        const variable = ir.inputs.variable;
        const variableOffset = variable._index * CatnipWasmUnionValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));

        switch (ir.inputs.format) {
            case CatnipValueFormat.i32:
            case CatnipValueFormat.f64: {
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);

                if (ir.inputs.format === CatnipValueFormat.i32)
                    ctx.emitWasm(SpiderOpcodes.f64_convert_i32_s);

                ctx.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset);
                break;
            }
            case CatnipValueFormat.HSTRING_PTR: {
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + 4);
                
                ctx.emitWasm(SpiderOpcodes.i32_const, VALUE_STRING_UPPER);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset);
                break;
            }

            case CatnipValueFormat.VALUE_BOXED: {
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset);
                break;
            }
        }

        ctx.releaseLocal(valueLocal);
    }
}