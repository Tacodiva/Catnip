
import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrTransientVariable } from "../../CatnipIrTransientVariable";
import { CatnipIrCommandOpType, CatnipIrOp, CatnipIrOpType, CatnipReadonlyIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";

export type pen_change_param_ir_inputs = { type: "set" | "change" };

export const ir_pen_change_param = new class extends CatnipIrCommandOpType<pen_change_param_ir_inputs> {
    public constructor() { super("pen_change_param"); }

    public getOperandCount(): number { return 2; }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<pen_change_param_ir_inputs, {}>): void {

        // If we've got a constant value (99% of cases) we optimize.
        if (ir.operands[0].isConstant) {

            const paramName = ir.operands[0].asConstantString();
            let paramMemberOffset: number;

            switch (paramName) {
                case "color":
                    paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_hue");
                    break;
                case "saturation":
                    paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_saturation");
                    break;
                case "brightness":
                    paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_value");
                    break;
                case "transparency":
                    paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_transparnecy");
                    break;
                default:
                    CatnipCompilerLogger.warn(`Invalid constant color param name '${paramName}'.`);
                    return;
            }

            // Store the value
            const value = ctx.createLocal(SpiderNumberType.f64);
            ctx.emitWasm(SpiderOpcodes.local_set, value.ref);

            // Drop the const param name. (it will be optimized out by binaryen)
            ctx.emitWasm(SpiderOpcodes.drop);

            // If the current HSV is out of date, we need to update it
            ctx.emitWasmGetCurrentTarget();
            ctx.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("pen_thsv_valid"));
            ctx.emitWasm(SpiderOpcodes.i32_eqz);

            ctx.pushExpression();
            ctx.emitWasmGetCurrentTarget();
            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_pen_update_thsv");
            ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

            // Alright, now our HSV is up to date, we can modify it.

            if (ir.inputs.type === "change") {
                // We need to get the old value
                ctx.emitWasmGetCurrentTarget();
                ctx.emitWasm(SpiderOpcodes.f64_load, 3, paramMemberOffset);

                // Add it to the value!
                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                ctx.emitWasm(SpiderOpcodes.f64_add);

                // Store
                ctx.emitWasm(SpiderOpcodes.local_set, value.ref);
            }

            // Clamp the value within the range
            if (paramName === "color") {
                // If it's hue we need to loop it
                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                ctx.emitWasmConst(SpiderNumberType.f64, 100);
                ctx.emitWasmRuntimeFunctionCall("catnip_math_fmod");
                ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

                // Now it's between -100 and 100, if it's negitive we need to 
                //  add 100 to it

                ctx.emitWasmConst(SpiderNumberType.f64, 0);
                ctx.emitWasm(SpiderOpcodes.f64_lt);

                ctx.pushExpression();

                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                ctx.emitWasmConst(SpiderNumberType.f64, 100);
                ctx.emitWasm(SpiderOpcodes.f64_add);
                ctx.emitWasm(SpiderOpcodes.local_set, value.ref);

                ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());
            } else {
                // Otherwise we need to clamp it between 0 and 100
                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                ctx.emitWasmConst(SpiderNumberType.f64, 0);
                ctx.emitWasm(SpiderOpcodes.f64_lt);

                ctx.pushExpression();

                // It's less than 0
                ctx.emitWasmConst(SpiderNumberType.f64, 0);
                ctx.emitWasm(SpiderOpcodes.local_set, value.ref);

                const trueExpr1 = ctx.popExpression();
                ctx.pushExpression();

                // Otherwise, see if it's greater than 100
                ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                ctx.emitWasmConst(SpiderNumberType.f64, 100);
                ctx.emitWasm(SpiderOpcodes.f64_gt);

                ctx.pushExpression();

                // It's greater than 100
                ctx.emitWasmConst(SpiderNumberType.f64, 100);
                ctx.emitWasm(SpiderOpcodes.local_set, value.ref);

                const trueExpr2 = ctx.popExpression();

                ctx.emitWasm(SpiderOpcodes.if, trueExpr2);

                const falseExpr1 = ctx.popExpression();

                ctx.emitWasm(SpiderOpcodes.if, trueExpr1, falseExpr1);
            }

            // Set the value!

            ctx.emitWasmGetCurrentTarget();
            ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
            ctx.emitWasm(SpiderOpcodes.f64_store, 3, paramMemberOffset);

            // Mark ARGB as out of date

            ctx.emitWasmGetCurrentTarget();
            ctx.emitWasmConst(SpiderNumberType.i32, 0);
            ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb_valid"));

            ctx.releaseLocal(value);
        } else {

            // Dynamic param name
            throw new Error("Not supported.");
        }
    }
}