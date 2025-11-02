import { SpiderLocalReference, SpiderNumberType, SpiderOpcodes, SpiderValueType } from "wasm-spider";
import { CatnipList } from "../../../runtime/CatnipList";
import { CatnipTarget } from "../../../runtime/CatnipTarget";
import { CatnipValue } from "../../CatnipValue";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { IR1InstrCast } from "../core/IR1InstrCast";
import { CatnipWasmStructTarget } from "../../../wasm-interop/CatnipWasmStructTarget";
import { CatnipWasmStructList } from "../../../wasm-interop/CatnipWasmStructList";
import { CatnipWasmUnionValue } from "../../../wasm-interop/CatnipWasmStructValue";

export const ListUtils = new class {

    public emitPushListPtr(
        emitter: CatnipCompilerWasmEmitter,
        target: CatnipTarget | null,
        list: CatnipList
    ) {
        if (target === null) emitter.emitWasmPushCurrentTarget();
        else emitter.emitWasmPushNumber(SpiderNumberType.i32, target.structWrapper.ptr);

        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        emitter.emitWasmPushNumber(SpiderNumberType.i32, list.index * CatnipWasmStructList.size);
        emitter.emitWasm(SpiderOpcodes.i32_add);
    }

    public emitPushListItemPtr(
        emitter: CatnipCompilerWasmEmitter,
        target: CatnipTarget | null,
        list: CatnipList,
        indexLocal: SpiderLocalReference
    ) {
        // Get the pointer to the list's data
        ListUtils.emitPushListDataPtr(emitter, target, list);

        // Get the offset of this index within the array
        emitter.emitWasm(SpiderOpcodes.local_get, indexLocal);
        emitter.emitWasmPushNumber(SpiderNumberType.i32, CatnipWasmUnionValue.size);
        emitter.emitWasm(SpiderOpcodes.i32_mul);

        // Add them to get the pointer of the value
        emitter.emitWasm(SpiderOpcodes.i32_add);
    }

    public emitPushListDataPtr(
        emitter: CatnipCompilerWasmEmitter,
        target: CatnipTarget | null,
        list: CatnipList
    ) {
        if (target === null) emitter.emitWasmPushCurrentTarget();
        else emitter.emitWasmPushNumber(SpiderNumberType.i32, target.structWrapper.ptr);

        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, list.index * CatnipWasmStructList.size + CatnipWasmStructList.getMemberOffset("data"));
    }

    public emitPushListLength(
        emitter: CatnipCompilerWasmEmitter,
        target: CatnipTarget | null,
        list: CatnipList
    ): void {
        if (target === null) emitter.emitWasmPushCurrentTarget();
        else emitter.emitWasmPushNumber(SpiderNumberType.i32, target.structWrapper.ptr);

        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructTarget.getMemberOffset("list_table"));
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, list.index * CatnipWasmStructList.size + CatnipWasmStructList.getMemberOffset("length"));

    }

    public emitListBoundsCheck(
        emitter: CatnipCompilerWasmEmitter,
        {
            index, target, list, allowEqualToLength, allowLast
        }: {
            index: CatnipValue,
            target: CatnipTarget | null,
            list: CatnipList,

            allowEqualToLength: boolean, // Used for inserting into a list
            allowLast: boolean, // Allow the string "last"
        },
        success: (emitter: CatnipCompilerWasmEmitter, index: SpiderLocalReference) => void,
        outOfRange: (emitter: CatnipCompilerWasmEmitter) => void,
        blocktype?: SpiderValueType
    ): void {

        const needsConversion = !CatnipValueFormatUtils.isAlways(index.format, CatnipValueFormat.I32_NUMBER);

        const castIndexVariable = emitter.borrowLocal(CatnipValueFormat.I32_NUMBER);
        const rawIndexVariable = emitter.borrowLocal(index.format);

        if (needsConversion) {
            emitter.emitWasm(SpiderOpcodes.local_set, rawIndexVariable);
        } else {
            emitter.emitWasm(SpiderOpcodes.local_set, castIndexVariable);
        }

        emitter.emitWasmBlock(emitter => {
            // block 1 [br -> End]

            emitter.emitWasmBlock(emitter => {
                // block 2 [br -> Out of range]

                emitter.emitWasmBlock(emitter => {
                    // block 3 [br -> Success]

                    if (needsConversion) {

                        if (!CatnipValueFormatUtils.isAlways(index.format, CatnipValueFormat.F64)) {
                            throw new Error("Not supported.");
                        }

                        emitter.emitWasm(SpiderOpcodes.local_get, rawIndexVariable);

                        IR1InstrCast.emitStringCheck(emitter, index.format,
                            (emitter, format, depth) => {
                                // The index is a string.

                                emitter.emitWasm(SpiderOpcodes.local_get, rawIndexVariable);

                                IR1InstrCast.emitConversion(emitter, CatnipValueFormat.F64_BOXED_I32_HSTRING, CatnipValueFormat.I32_HSTRING);

                                const stringLocal = emitter.borrowLocal(CatnipValueFormat.I32_NUMBER);
                                emitter.emitWasm(SpiderOpcodes.local_set, stringLocal);

                                // We need to check if this string is one of the special strings

                                if (allowLast) {
                                    const isConstLast = index.isConstant && index.asConstantString() === "last";

                                    if (isConstLast) {
                                        emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
                                    } else {
                                        emitter.emitWasm(SpiderOpcodes.local_get, stringLocal);
                                        emitter.emitWasmPushString("last");
                                        emitter.emitWasmRuntimeFunctionCall("catnip_blockutil_hstring_eq_strict");
                                    }

                                    emitter.emitWasmIf(ctx => {
                                        // The index is 'last', we need to find the last index and jump to the end
                                        this.emitPushListLength(ctx, target, list);

                                        // Subtract 1
                                        ctx.emitWasmPushNumber(SpiderNumberType.i32, 1);
                                        ctx.emitWasm(SpiderOpcodes.i32_sub);

                                        // Set the index
                                        ctx.emitWasm(SpiderOpcodes.local_tee, castIndexVariable);

                                        // If it's 0, we go to out of range
                                        ctx.emitWasm(SpiderOpcodes.i32_eqz);

                                        ctx.emitWasm(SpiderOpcodes.br_if, 2 + depth); // out of range

                                        // Otherwise, success!
                                        ctx.emitWasm(SpiderOpcodes.br, 1 + depth); // Success
                                    });

                                    if (isConstLast) {
                                        emitter.returnLocal(stringLocal);
                                        return; // We don't emit the rest of this check
                                    }
                                }

                                // TODO any or random here

                                // Cast our string into an int and set it
                                emitter.emitWasm(SpiderOpcodes.local_get, stringLocal);
                                IR1InstrCast.emitConversion(emitter, CatnipValueFormat.I32_HSTRING, CatnipValueFormat.I32_NUMBER);
                                emitter.emitWasm(SpiderOpcodes.local_set, castIndexVariable);

                                emitter.returnLocal(stringLocal);
                            },
                            (ctx) => {
                                // The index is a number

                                ctx.emitWasm(SpiderOpcodes.local_get, rawIndexVariable);
                                IR1InstrCast.emitConversion(ctx, index.format & CatnipValueFormat.F64_NUMBER_OR_NAN, CatnipValueFormat.I32_NUMBER);
                                ctx.emitWasm(SpiderOpcodes.local_set, castIndexVariable);
                            }
                        );
                    }

                    // Subtract 1
                    emitter.emitWasm(SpiderOpcodes.local_get, castIndexVariable);
                    emitter.emitWasmPushNumber(SpiderNumberType.i32, 1);
                    emitter.emitWasm(SpiderOpcodes.i32_sub);

                    // First, check lower bound (if it's less than 0)
                    emitter.emitWasm(SpiderOpcodes.local_tee, castIndexVariable);
                    emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
                    emitter.emitWasm(SpiderOpcodes.i32_lt_s);

                    emitter.emitWasm(SpiderOpcodes.br_if, 1); // out of range

                    // Now check upper bound
                    emitter.emitWasm(SpiderOpcodes.local_get, castIndexVariable);
                    this.emitPushListLength(emitter, target, list);

                    if (allowEqualToLength) {
                        emitter.emitWasm(SpiderOpcodes.i32_gt_s);
                    } else {
                        emitter.emitWasm(SpiderOpcodes.i32_ge_s);
                    }

                    emitter.emitWasm(SpiderOpcodes.br_if, 1); // out of range

                    // Fall through block 3 to success
                });
                // block 3 [br -> Success]

                // Success
                success(emitter, castIndexVariable);

                emitter.emitWasm(SpiderOpcodes.br, 1);

            });
            // block 2 [br -> Fail]

            // Out of range
            outOfRange(emitter);

            // Fall through to end

        }, blocktype);

        // End

        emitter.returnLocal(castIndexVariable);
        emitter.returnLocal(rawIndexVariable);
    }

};