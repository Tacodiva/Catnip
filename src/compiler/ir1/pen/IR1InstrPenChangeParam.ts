import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export enum IR1PenParameter {
    COLOR,
    SATURATION,
    BRIGHTNESS,
    TRANSPARENCY,
    // Dynamic means we have to get the input from the stack
    DYNAMIC
}

export enum IR1PenParameterChangeType {
    SET,
    ADD
}

export class IR1InstrPenChangeParam extends IR1Instruction {

    public readonly parameter: IR1PenParameter;
    public readonly type: IR1PenParameterChangeType;

    public constructor(parameter: IR1PenParameter, type: IR1PenParameterChangeType) {
        super();
        this.parameter = parameter;
        this.type = type;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        if (this.parameter === IR1PenParameter.DYNAMIC)
            throw new Error("Not supported :c");

        let paramMemberOffset: number;

        switch (this.parameter) {
            case IR1PenParameter.COLOR:
                paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_hue");
                break;
            case IR1PenParameter.SATURATION:
                paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_saturation");
                break;
            case IR1PenParameter.BRIGHTNESS:
                paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_value");
                break;
            case IR1PenParameter.TRANSPARENCY:
                paramMemberOffset = CatnipWasmStructTarget.getMemberOffset("pen_transparnecy");
                break;
        }

        // Store the value
        const value = emitter.borrowLocal(SpiderNumberType.f64);
        emitter.emitWasm(SpiderOpcodes.local_set, value);

        // If the current HSV is out of date, we need to update it
        emitter.emitWasmPushCurrentTarget();
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("pen_thsv_valid"));
        emitter.emitWasm(SpiderOpcodes.i32_eqz);

        emitter.emitWasm(SpiderOpcodes.if,
            emitter.emitExpression(emitter => {
                emitter.emitWasmPushCurrentTarget();
                emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_pen_update_thsv");
            })
        );

        // Alright, now our HSV is up to date, we can modify it.

        if (this.type === IR1PenParameterChangeType.ADD) {
            // We need to get the old value
            emitter.emitWasmPushCurrentTarget();
            emitter.emitWasm(SpiderOpcodes.f64_load, 3, paramMemberOffset);

            // Add it to the value!
            emitter.emitWasm(SpiderOpcodes.local_get, value);
            emitter.emitWasm(SpiderOpcodes.f64_add);

            // Store
            emitter.emitWasm(SpiderOpcodes.local_set, value);
        }

        // Clamp the value within the range
        if (this.parameter === IR1PenParameter.COLOR) {
            // If it's hue we need to loop it
            emitter.emitWasm(SpiderOpcodes.local_get, value);
            emitter.emitWasmPushNumber(SpiderNumberType.f64, 100);
            emitter.emitWasmRuntimeFunctionCall("catnip_math_fmod");
            emitter.emitWasm(SpiderOpcodes.local_tee, value);

            // Now it's between -100 and 100, if it's negitive we need to 
            //  add 100 to it

            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
            emitter.emitWasm(SpiderOpcodes.f64_lt);

            emitter.emitWasm(SpiderOpcodes.if,
                emitter.emitExpression(emitter => {
                    emitter.emitWasm(SpiderOpcodes.local_get, value);
                    emitter.emitWasmPushNumber(SpiderNumberType.f64, 100);
                    emitter.emitWasm(SpiderOpcodes.f64_add);
                    emitter.emitWasm(SpiderOpcodes.local_set, value);
                })
            );
        } else {
            // Otherwise we need to clamp it between 0 and 100
            emitter.emitWasm(SpiderOpcodes.local_get, value);
            emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
            emitter.emitWasm(SpiderOpcodes.f64_lt);

            emitter.emitWasm(SpiderOpcodes.if,
                emitter.emitExpression(emitter => {
                    // It is < 0
                    emitter.emitWasmPushNumber(SpiderNumberType.f64, 0);
                    emitter.emitWasm(SpiderOpcodes.local_set, value);
                }),
                emitter.emitExpression(emitter => {
                    // Otherwise, see if it's greater than 100
                    emitter.emitWasm(SpiderOpcodes.local_get, value);
                    emitter.emitWasmPushNumber(SpiderNumberType.f64, 100);
                    emitter.emitWasm(SpiderOpcodes.f64_gt);

                    emitter.emitWasm(SpiderOpcodes.if,
                        emitter.emitExpression(emitter => {
                            // It is > 100
                            emitter.emitWasmPushNumber(SpiderNumberType.f64, 100);
                            emitter.emitWasm(SpiderOpcodes.local_set, value);
                        })
                    );
                })
            );
        }

        // Set the value!

        emitter.emitWasmPushCurrentTarget();
        emitter.emitWasm(SpiderOpcodes.local_get, value);
        emitter.emitWasm(SpiderOpcodes.f64_store, 3, paramMemberOffset);

        // Mark ARGB as out of date

        emitter.emitWasmPushCurrentTarget();
        emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructTarget.getMemberOffset("pen_argb_valid"));

        emitter.returnLocal(value);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`pen_change_param ${IR1PenParameter[this.parameter]}`);
    }

}