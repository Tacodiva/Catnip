


import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmGenContext } from "../../CatnipCompilerWasmGenContext";
import { CatnipIrCommandOpType, CatnipIrOp } from "../../CatnipIrOp";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipValueFormatUtils } from '../../CatnipValueFormatUtils';
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCostume } from "../../../runtime/CatnipCostume";
import { Cast } from "../../cast";
import { ir_cast } from "../core/cast";

export type set_costume_ir_inputs = {};

export const ir_set_costume = new class extends CatnipIrCommandOpType<set_costume_ir_inputs> {
    public constructor() { super("looks_set_costume"); }

    public getOperandCount(): number { return 1; }

    private _emitSetCostume(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<set_costume_ir_inputs, {}>, costumeIndex: number) {
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasmConst(SpiderNumberType.i32, costumeIndex);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
    }

    private _emitNegCheckAndSet(ctx: CatnipCompilerWasmGenContext) {
        const value = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

        // If it's less than zero, add the costume count
        ctx.emitWasmConst(SpiderNumberType.i32, 0);
        ctx.emitWasm(SpiderOpcodes.i32_lt_s);

        ctx.pushExpression();

        ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
        ctx.emitWasmConst(SpiderNumberType.i32, ctx.sprite.costumes.length);
        ctx.emitWasm(SpiderOpcodes.i32_add);
        ctx.emitWasm(SpiderOpcodes.local_set, value.ref);

        ctx.emitWasm(SpiderOpcodes.if, ctx.popExpression());

        // Set it :3
        ctx.emitWasmGetCurrentTarget();
        ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
        ctx.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("costume"));

        ctx.releaseLocal(value);
    }

    private _emitSetF64(ctx: CatnipCompilerWasmGenContext, costumeValueFormat: CatnipValueFormat) {
        // Subtract 1
        ctx.emitWasmConst(SpiderNumberType.f64, 1);
        ctx.emitWasm(SpiderOpcodes.f64_sub);

        // Make it an int
        ir_cast.cast(ctx, costumeValueFormat, CatnipValueFormat.F64_INT);

        // Take the mod
        ctx.emitWasmConst(SpiderNumberType.f64, ctx.sprite.costumes.length);
        ctx.emitWasmRuntimeFunctionCall("catnip_math_fmod");

        // Turn it into an i32
        ctx.emitWasm(SpiderOpcodes.i32_trunc_f64_s);

        const value = ctx.createLocal(SpiderNumberType.i32);
        ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

        this._emitNegCheckAndSet(ctx);

        ctx.releaseLocal(value);
    }

    public generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<set_costume_ir_inputs, {}>): void {
        const costumeValue = ir.operands[0];

        const costumeCount = ctx.sprite.costumes.length;

        if (costumeValue.isConstant) {
            // Yay

            // Drop the constant
            ctx.emitWasm(SpiderOpcodes.drop);

            if (CatnipValueFormatUtils.isAlways(costumeValue.format, CatnipValueFormat.F64_NUMBER | CatnipValueFormat.I32_NUMBER)) {
                // The input is a number, switch to that costume index (if it's within range)

                let costumeIndex = Math.round(costumeValue.asConstantNumber()) - 1;

                if (!isFinite(costumeIndex)) {
                    costumeIndex = 0;
                }

                costumeIndex %= costumeCount;
                if (costumeIndex < 0) costumeIndex += costumeCount;

                this._emitSetCostume(ctx, ir, costumeIndex);

                return;
            }

            const costumeName = costumeValue.asConstantString();

            let costume: CatnipCostume | null = null;

            for (const testCostume of ctx.sprite.costumes) {
                if (testCostume.name === costumeName) {
                    costume = testCostume;
                    break;
                }
            }

            if (costume !== null) {
                this._emitSetCostume(ctx, ir, costume.index);
            } else if (costumeName === "next costume") {
                throw new Error("Not supported.");
            } else if (costumeName === "previous costume") {
                throw new Error("Not supported.");
            } else if (!(isNaN(+costumeName) || Cast.isWhiteSpace(costumeName))) {
                this._emitSetCostume(ctx, ir, Math.round(+costumeName) - 1);
            }

            return;
        }

        // The value isn't a constant, if it's always a string we can just call the C function to deal with it
        if (CatnipValueFormatUtils.isAlways(costumeValue.format, CatnipValueFormat.F64_BOXED_I32_HSTRING | CatnipValueFormat.I32_HSTRING)) {
            // Unbox the string if we need to
            ir_cast.cast(ctx, costumeValue.format, CatnipValueFormat.I32_HSTRING);
            ctx.emitWasmGetCurrentTarget();
            ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_costume_set");
            return;
        }

        if (CatnipValueFormatUtils.isAlways(costumeValue.format, CatnipValueFormat.I32_NUMBER)) {
            // Subtract 1 from the value
            ctx.emitWasmConst(SpiderNumberType.i32, 1);
            ctx.emitWasm(SpiderOpcodes.i32_sub);

            // Take the remainder
            ctx.emitWasmConst(SpiderNumberType.i32, costumeCount);
            ctx.emitWasm(SpiderOpcodes.i32_rem_s);

            this._emitNegCheckAndSet(ctx);

            return;
        }

        if (CatnipValueFormatUtils.isAlways(costumeValue.format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            this._emitSetF64(ctx, costumeValue.format);
            return;
        }

        if (CatnipValueFormatUtils.isAlways(costumeValue.format, CatnipValueFormat.F64)) {

            // If it's a string, call the runtime function, otherwise set it

            const value = ctx.createLocal(SpiderNumberType.f64);
            ctx.emitWasm(SpiderOpcodes.local_tee, value.ref);

            ir_cast.emitStringCheck(ctx, costumeValue.format,
                (ctx, format) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    ir_cast.cast(ctx, format, CatnipValueFormat.I32_HSTRING)
                    ctx.emitWasmGetCurrentTarget();
                    ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_costume_set");
                },
                (ctx, format) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, value.ref);
                    this._emitSetF64(ctx, format);
                }
            );

            ctx.releaseLocal(value);

            return;
        }

        throw new Error(`Format not supported '${CatnipValueFormatUtils.stringify(costumeValue.format)}'`)
    }
}