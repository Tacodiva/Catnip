import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCostume } from "../../../runtime/CatnipCostume";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { Cast } from "../../cast";
import { CatnipValue } from "../../CatnipValue";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1InstrCast } from "../core/IR1InstrCast";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrLooksCostumeSet extends IR1Instruction {

    public costume: CatnipValue;

    public constructor(costume: CatnipValue) {
        super();
        this.costume = costume;
    }

    private _emitSetCostume(emitter: CatnipCompilerWasmEmitter, costumeIndex: number) {
        emitter.emitWasmPushCurrentTarget();
        emitter.emitWasmPushNumber(SpiderNumberType.i32, costumeIndex);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("costume"));
    }

    private _emitNegCheckAndSet(emitter: CatnipCompilerWasmEmitter) {
        const value = emitter.borrowLocal(SpiderNumberType.i32);
        emitter.emitWasm(SpiderOpcodes.local_tee, value);

        // If it's less than zero, add the costume count
        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
        emitter.emitWasm(SpiderOpcodes.i32_lt_s);

        emitter.emitWasmIf(emitter => {
            emitter.emitWasm(SpiderOpcodes.local_get, value);
            emitter.emitWasmPushNumber(SpiderNumberType.i32, emitter.sprite.costumes.length);
            emitter.emitWasm(SpiderOpcodes.i32_add);
            emitter.emitWasm(SpiderOpcodes.local_set, value);
        });

        // Set it :3
        emitter.emitWasmPushCurrentTarget();
        emitter.emitWasm(SpiderOpcodes.local_get, value);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("costume"));

        emitter.returnLocal(value);
    }

    private _emitSetF64(emitter: CatnipCompilerWasmEmitter, format: CatnipValueFormat) {
        // Subtract 1
        emitter.emitWasmPushNumber(SpiderNumberType.f64, 1);
        emitter.emitWasm(SpiderOpcodes.f64_sub);

        // Make it an int
        IR1InstrCast.emitConversion(emitter, format, CatnipValueFormat.F64_INT);

        // Take the mod
        emitter.emitWasmPushNumber(SpiderNumberType.f64, emitter.sprite.costumes.length);
        emitter.emitWasmRuntimeFunctionCall("catnip_math_fmod");

        // Turn it into an i32
        emitter.emitWasm(SpiderOpcodes.i32_trunc_f64_s);

        const value = emitter.borrowLocal(SpiderNumberType.i32);
        emitter.emitWasm(SpiderOpcodes.local_tee, value);

        this._emitNegCheckAndSet(emitter);

        emitter.returnLocal(value);
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        const costumeCount = emitter.sprite.costumes.length;

        if (this.costume.isConstant) {
            // Yay

            // Drop the constant
            emitter.emitWasm(SpiderOpcodes.drop);

            if (CatnipValueFormatUtils.isAlways(this.costume.format, CatnipValueFormat.F64_NUMBER | CatnipValueFormat.I32_NUMBER)) {
                // The input is a number, switch to that costume index (if it's within range)

                let costumeIndex = Math.round(this.costume.asConstantNumber()) - 1;

                if (!isFinite(costumeIndex)) {
                    costumeIndex = 0;
                }

                costumeIndex %= costumeCount;
                if (costumeIndex < 0) costumeIndex += costumeCount;

                this._emitSetCostume(emitter, costumeIndex);
                return;
            }

            const costumeName = this.costume.asConstantString();

            let costume: CatnipCostume | null = null;

            for (const testCostume of emitter.sprite.costumes) {
                if (testCostume.name === costumeName) {
                    costume = testCostume;
                    break;
                }
            }

            if (costume !== null) {
                this._emitSetCostume(emitter, costume.index);
            } else if (costumeName === "next costume") {
                throw new Error("Not supported.");
            } else if (costumeName === "previous costume") {
                throw new Error("Not supported.");
            } else if (!(isNaN(+costumeName) || Cast.isWhiteSpace(costumeName))) {
                this._emitSetCostume(emitter, Math.round(+costumeName) - 1);
            }

            return;
        }

        // The value isn't a constant, if it's always a string we can just call the C function to deal with it
        if (CatnipValueFormatUtils.isAlways(this.costume.format, CatnipValueFormat.F64_BOXED_I32_HSTRING | CatnipValueFormat.I32_HSTRING)) {
            // Unbox the string if we need to
            IR1InstrCast.emitConversion(emitter, this.costume.format, CatnipValueFormat.I32_HSTRING);
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_costume_set");
            return;
        }

        if (CatnipValueFormatUtils.isAlways(this.costume.format, CatnipValueFormat.I32_NUMBER)) {
            // Subtract 1 from the value
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
            emitter.emitWasm(SpiderOpcodes.i32_sub);

            // Take the remainder
            emitter.emitWasmPushNumber(SpiderNumberType.i32, costumeCount);
            emitter.emitWasm(SpiderOpcodes.i32_rem_s);

            this._emitNegCheckAndSet(emitter);

            return;
        }

        if (CatnipValueFormatUtils.isAlways(this.costume.format, CatnipValueFormat.F64_NUMBER_OR_NAN)) {
            this._emitSetF64(emitter, this.costume.format);
            return;
        }

        if (CatnipValueFormatUtils.isAlways(this.costume.format, CatnipValueFormat.F64)) {

            // If it's a string, call the runtime function, otherwise set it

            const value = emitter.borrowLocal(SpiderNumberType.f64);
            emitter.emitWasm(SpiderOpcodes.local_tee, value);

            IR1InstrCast.emitStringCheck(emitter, this.costume.format,
                (ctx, format) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, value);
                    IR1InstrCast.emitConversion(ctx, format, CatnipValueFormat.I32_HSTRING)
                    ctx.emitWasmPushCurrentTarget();
                    ctx.emitWasmRuntimeFunctionCall("catnip_blockutil_costume_set");
                },
                (ctx, format) => {
                    ctx.emitWasm(SpiderOpcodes.local_get, value);
                    this._emitSetF64(ctx, format);
                }
            );

            emitter.returnLocal(value);

            return;
        }

        throw new Error(`Format not supported '${CatnipValueFormatUtils.stringify(this.costume.format)}'`)

    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine("looks_costume_set");
    }
}