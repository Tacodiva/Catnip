import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";

export enum IR1InstrOperatorCmpLtGtType {
    LESS_THAN,
    GREATER_THAN
}

export class IR1InstrOperatorCmpLtGt extends IR1Instruction {

    public readonly type: IR1InstrOperatorCmpLtGtType;
    public readonly leftFormat: CatnipValueFormat;
    public readonly rightFormat: CatnipValueFormat;

    public constructor(type: IR1InstrOperatorCmpLtGtType, leftFormat: CatnipValueFormat, rightFormat: CatnipValueFormat) {
        super();
        this.type = type;
        this.leftFormat = leftFormat;
        this.rightFormat = rightFormat;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        const emitShortcutCheck = (emitter: CatnipCompilerWasmEmitter) => {
            if (this.type === IR1InstrOperatorCmpLtGtType.GREATER_THAN) {
                emitter.emitWasm(SpiderOpcodes.f64_gt);
            } else {
                emitter.emitWasm(SpiderOpcodes.f64_lt);
            }
        }

        const emitFullCheck = (emitter: CatnipCompilerWasmEmitter) => {
            emitter.emitWasmPushRuntime();
            emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_value_cmp");
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);

            if (this.type === IR1InstrOperatorCmpLtGtType.GREATER_THAN) {
                emitter.emitWasm(SpiderOpcodes.i32_gt_s);
            } else {
                emitter.emitWasm(SpiderOpcodes.i32_lt_s);
            }
        }
        if (CatnipValueFormatUtils.isAlways(this.leftFormat, CatnipValueFormat.F64_NUMBER_OR_NAN)
            && CatnipValueFormatUtils.isAlways(this.rightFormat, CatnipValueFormat.F64_NUMBER_OR_NAN)) {

            if (CatnipValueFormatUtils.isSometimes(this.rightFormat, CatnipValueFormat.F64_NAN)) {

                const rightTemp = emitter.borrowLocal(this.rightFormat);
                emitter.emitWasm(SpiderOpcodes.local_set, rightTemp);

                const leftTemp = emitter.borrowLocal(this.leftFormat);
                emitter.emitWasm(SpiderOpcodes.local_set, leftTemp);


                // NaN check on the right value
                emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                emitter.emitWasm(SpiderOpcodes.f64_eq);

                emitter.emitWasmIf(
                    emitter => {
                        // The right is not NaN. The left might be NaN though.
                        if (CatnipValueFormatUtils.isSometimes(this.leftFormat, CatnipValueFormat.F64_NAN)) {

                            // NaN check on the left value
                            emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                            emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                            emitter.emitWasm(SpiderOpcodes.f64_eq);

                            emitter.emitWasmIf(
                                emitter => {
                                    // Right is not NaN and left is not NaN.
                                    emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                                    emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                                    emitShortcutCheck(emitter);
                                },
                                emitter => {
                                    // Right is not NaN and left is NaN.
                                    emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                                    emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                                    emitFullCheck(emitter);
                                },
                                SpiderNumberType.i32
                            );

                            emitter.returnLocal(leftTemp);
                        } else {
                            // Right is not NaN and left can't be NaN.
                            emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                            emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                            emitShortcutCheck(emitter);
                        }
                    },
                    emitter => {
                        // The right is NaN.
                        emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                        emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                        emitFullCheck(emitter);
                    },
                    SpiderNumberType.i32
                );

                emitter.returnLocal(rightTemp);

            } else if (CatnipValueFormatUtils.isSometimes(this.leftFormat, CatnipValueFormat.F64_NAN)) {
                // The right cannot be NaN, but the left could be.

                const rightTemp = emitter.borrowLocal(this.rightFormat);
                emitter.emitWasm(SpiderOpcodes.local_set, rightTemp);

                const leftTemp = emitter.borrowLocal(this.leftFormat);
                // NaN check on the left value
                emitter.emitWasm(SpiderOpcodes.local_tee, leftTemp);
                emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                emitter.emitWasm(SpiderOpcodes.f64_eq);

                emitter.emitWasmIf(
                    emitter => {
                        // Left is not NaN and right cannot be NaN.
                        emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                        emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                        emitShortcutCheck(emitter);
                    },
                    emitter => {
                        // Right is NaN and left cannot be NaN.
                        emitter.emitWasm(SpiderOpcodes.local_get, leftTemp);
                        emitter.emitWasm(SpiderOpcodes.local_get, rightTemp);
                        emitFullCheck(emitter);
                    },
                    SpiderNumberType.i32
                );

                emitter.returnLocal(leftTemp);
                emitter.returnLocal(rightTemp);
            } else {
                // Neither can be NaN
                emitShortcutCheck(emitter);
            }
        } else {
            // Either of them may be a string.
            // TODO This can be optimized in the case that one of the values is def a number
            emitFullCheck(emitter);
        }
    }

    public stringify(ctx: IR1StringificationContext): void {
        if (this.type === IR1InstrOperatorCmpLtGtType.GREATER_THAN) {
            ctx.writeLine(`operator_cmp_gt`);
        } else {
            ctx.writeLine(`operator_cmp_lt`);
        }
    }
}
