
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipVariable, CatnipVariableID } from "../../../runtime/CatnipVariable";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { CatnipValueFlags, CatnipValueFormat, getValueFormatSpiderType } from "../../types";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmEnumValueFlags, CatnipWasmStructValue } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipTarget } from "../../../runtime/CatnipTarget";

type set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_set_var = new class extends CatnipCommandOpType<set_var_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_var_inputs): void {
        ctx.emitInput(inputs.value);
        const input = ctx.stack.peek();
        const format = input.format;

        const sprite = ctx.project.getSprite(inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(inputs.variable)!;

        ctx.emitIr(ir_set_var, { target, variable, format }, {});
    }
}

export type set_var_ir_inputs = { target: CatnipTarget, variable: CatnipVariable, format: CatnipValueFormat };

export const ir_set_var = new class extends CatnipIrCommandOpType<set_var_ir_inputs> {
    public constructor() { super("data_set_var"); }

    public getOperandCount(): number { return 1; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<set_var_ir_inputs>): void {

        const valueLocal = ctx.createLocal(getValueFormatSpiderType(ir.inputs.format));

        ctx.emitWasm(SpiderOpcodes.local_set, valueLocal.ref);

        // TODO 1 check to see if the old value of the variable has a string that needs releasing.
        // TODO 2 Also this can eventually only happen if we know from type analysis the variable could be a string.
        // TODO 3 When we set a variable, we should put its value in a local instead then update the actual
        //    variable at the end of the function. This would optimize the same variable being written / read
        //    in the same func, but can only happen if all reads / write are in the same format.

        const target = ir.inputs.target;
        const variable = ir.inputs.variable;
        const variableOffset = variable._index * CatnipWasmStructValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));

        const variableAddressLocal = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_tee, variableAddressLocal.ref);

        switch (ir.inputs.format) {
            case CatnipValueFormat.i32:
            case CatnipValueFormat.f64:
                // valuePtr->flags = CatnipWasmEnumValueFlags.VAL_DOUBLE
                ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_DOUBLE);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("flags"));

                // valuePtr->val_double = (f64) value
                ctx.emitWasm(SpiderOpcodes.local_get, variableAddressLocal.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);

                if (ir.inputs.format === CatnipValueFormat.i32)
                    ctx.emitWasm(SpiderOpcodes.f64_convert_i32_s);

                ctx.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset + CatnipWasmStructValue.getMemberOffset("val_double"));
                break;
            case CatnipValueFormat.HSTRING_PTR:
                // valuePtr->flags = CatnipWasmEnumValueFlags.VAL_STRING
                ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_STRING);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("flags"));

                // valuePtr->val_string = value
                ctx.emitWasm(SpiderOpcodes.local_get, variableAddressLocal.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("val_string"));
                break;
            
            case CatnipValueFormat.VALUE_PTR:
                // *valuePtr = *value
                CatnipCompilerWasmGenContext.logger.assert(CatnipWasmStructValue.size === 16);
                // copy first 8 bytes
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i64_load, 3, 0);
                ctx.emitWasm(SpiderOpcodes.i64_store, 3, variableOffset + 0);

                // copy second 8 bytes
                ctx.emitWasm(SpiderOpcodes.local_get, variableAddressLocal.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i64_load, 3, 8);
                ctx.emitWasm(SpiderOpcodes.i64_store, 3, variableOffset + 8);
                break;
        }

        ctx.releaseLocal(variableAddressLocal);
        ctx.releaseLocal(valueLocal);
    }
}