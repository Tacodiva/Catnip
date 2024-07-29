
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerIrGenContext } from "../../../compiler/CatnipCompilerIrGenContext";
import { CatnipCompilerWasmGenContext } from "../../../compiler/CatnipCompilerWasmGenContext";
import { CatnipSpriteID } from "../../../runtime/CatnipSprite";
import { CatnipVariableID } from "../../../runtime/CatnipVariable";
import { CatnipIrCommandOp, CatnipIrCommandOpType } from "../../CatnipIrOp";
import { CatnipCommandOpType, CatnipInputOp } from "../../CatnipOp";
import { CatnipInputFlags, CatnipInputFormat, getInputFormatSpiderType } from "../../types";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmEnumValueFlags, CatnipWasmStructValue } from "../../../wasm-interop/CatnipWasmStructValue";

type set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, value: CatnipInputOp };

export const op_set_var = new class extends CatnipCommandOpType<set_var_inputs> {
    public generateIr(ctx: CatnipCompilerIrGenContext, inputs: set_var_inputs): void {
        const ir = ctx.emitInput(inputs.value, CatnipInputFormat.ANY, CatnipInputFlags.ANY);
        const format = ir.type.getOutputFormat(ir);
        ir.format = format;
        ctx.emitIrCommand(ir_set_var, { sprite: inputs.sprite, variable: inputs.variable, format }, {});
    }
}

type ir_set_var_inputs = { sprite: CatnipSpriteID, variable: CatnipVariableID, format: CatnipInputFormat };


export const ir_set_var = new class extends CatnipIrCommandOpType<ir_set_var_inputs> {
    public constructor() { super("data_set_var"); }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<ir_set_var_inputs>): void {

        const valueLocal = ctx.createLocal(getInputFormatSpiderType(ir.inputs.format));

        ctx.emitWasm(SpiderOpcodes.local_set, valueLocal.ref);

        // TODO 1 check to see if the old value of the variable has a string that needs releasing.
        // TODO 2 Also this can eventually only happen if we know from type analysis the variable could be a string.
        // TODO 3 When we set a variable, we should put its value in a local instead then update the actual
        //    variable at the end of the function. This would optimize the same variable being written / read
        //    in the same func, but can only happen if all reads / write are in the same format.

        const sprite = ctx.project.getSprite(ir.inputs.sprite)!;
        const target = sprite.defaultTarget;
        const variable = sprite.getVariable(ir.inputs.variable)!;
        const variableOffset = variable._index * CatnipWasmStructValue.size;

        ctx.emitWasmConst(SpiderNumberType.i32, target.structWrapper.ptr);
        ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("variable_table"));

        const variableAddressLocal = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_tee, variableAddressLocal.ref);

        switch (ir.inputs.format) {
            case CatnipInputFormat.i32:
            case CatnipInputFormat.f64:
                // valuePtr->flags = CatnipWasmEnumValueFlags.VAL_DOUBLE
                ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_DOUBLE);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("flags"));

                // valuePtr->val_double = (f64) value
                ctx.emitWasm(SpiderOpcodes.local_get, variableAddressLocal.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);

                if (ir.inputs.format === CatnipInputFormat.i32)
                    ctx.emitWasm(SpiderOpcodes.f64_convert_i32_s);

                ctx.emitWasm(SpiderOpcodes.f64_store, 3, variableOffset + CatnipWasmStructValue.getMemberOffset("val_double"));
                break;
            case CatnipInputFormat.HSTRING_PTR:
                // valuePtr->flags = CatnipWasmEnumValueFlags.VAL_STRING
                ctx.emitWasmConst(SpiderNumberType.i32, CatnipWasmEnumValueFlags.VAL_STRING);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("flags"));

                // valuePtr->val_string = value
                ctx.emitWasm(SpiderOpcodes.local_get, variableAddressLocal.ref);
                ctx.emitWasm(SpiderOpcodes.local_get, valueLocal.ref);
                ctx.emitWasm(SpiderOpcodes.i32_store, 2, variableOffset + CatnipWasmStructValue.getMemberOffset("val_string"));
                break;
            
            case CatnipInputFormat.VALUE_PTR:
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