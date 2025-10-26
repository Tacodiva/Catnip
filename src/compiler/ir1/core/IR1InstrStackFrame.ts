import { SpiderLocalVariableReference, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";

export class IR1InstrStackFrame extends IR1Instruction {

    public frame: CatnipValueFormat[];

    public constructor(frame: CatnipValueFormat[]) {
        super();
        this.frame = frame;
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`stack_frame [${this.frame.map(f => CatnipValueFormatUtils.stringify(f)).join()}]`);
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        const frameValues: [ref: SpiderLocalVariableReference, format: CatnipValueFormat][] = [];

        // The frame is reversed because we have pushed the values onto the stack in order.
        //  If a function takes [A, B, C], then that will be the WASM stack. We will pop the items
        //  in the order [C, B, A], so the stack is stored in reverse.
        for (const valueFormat of [...this.frame].reverse()) {
            const local = emitter.borrowLocal(CatnipValueFormatUtils.getFormatSpiderType(valueFormat));
            emitter.emitWasm(SpiderOpcodes.local_set, local);
            frameValues.push([local, valueFormat]);
        }

        const frameSizeBytes = this.frame.length * 8;

        if (frameSizeBytes === 0) return;

        emitter.emitWasmPushStackEnd();

        // Get the stack pointer and save it it a local
        emitter.emitWasmPushStackPtr();
        const baseStackPtrVar = emitter.borrowLocal(SpiderNumberType.i32);
        emitter.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar);

        // Add the stack size
        emitter.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
        emitter.emitWasm(SpiderOpcodes.i32_add);

        // Save the new stack pointer
        const newStackPtrVar = emitter.borrowLocal(SpiderNumberType.i32);
        emitter.emitWasm(SpiderOpcodes.local_tee, newStackPtrVar);

        // (stackEnd < stackPtr + targetFunc.stackSize)
        emitter.emitWasm(SpiderOpcodes.i32_lt_u);

        emitter.emitWasmIf(emitter => {
            // The stack is not big enough :c, let's resize it :3
            emitter.emitWasmPushThread();
            emitter.emitWasmPushNumber(SpiderNumberType.i32, this.frame.length);
            emitter.emitWasmRuntimeFunctionCall("catnip_thread_resize_stack");

            emitter.emitWasmPushStackPtr();
            // Update the base stack pointer local
            emitter.emitWasm(SpiderOpcodes.local_tee, baseStackPtrVar);

            // Update the new stack pointer local
            emitter.emitWasmPushNumber(SpiderNumberType.i32, frameSizeBytes);
            emitter.emitWasm(SpiderOpcodes.i32_add);
            emitter.emitWasm(SpiderOpcodes.local_set, newStackPtrVar);
        });

        let stackOffset = 0;

        for (const frameValue of frameValues) {

            const valueLocal = frameValue[0];
            const valueFormat = frameValue[1];

            emitter.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
            emitter.emitWasm(SpiderOpcodes.local_get, valueLocal);

            // We store it as a boxed f64 then undo this when we load it from the stack again
            if (CatnipValueFormatUtils.isAlways(valueFormat, CatnipValueFormat.I32_HSTRING)) {

                // This is so GC can track we're using this string
                emitter.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset);

                // Store the upper bits
                emitter.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
                emitter.emitWasmPushNumber(SpiderNumberType.i32, VALUE_STRING_UPPER);
                emitter.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset + 4);

            } else if (CatnipValueFormatUtils.isAlways(valueFormat, CatnipValueFormat.I32_NUMBER)) {

                emitter.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset);

                // Clear the upper bits
                emitter.emitWasm(SpiderOpcodes.local_get, baseStackPtrVar);
                emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
                emitter.emitWasm(SpiderOpcodes.i32_store, 2, stackOffset + 4);

            } else if (CatnipValueFormatUtils.isAlways(valueFormat, CatnipValueFormat.F64)) {

                emitter.emitWasm(SpiderOpcodes.f64_store, 3, stackOffset);

            } else {
                CatnipCompilerLogger.assert(
                    false, true, `Unsupported stack type '${CatnipValueFormatUtils.stringify(valueFormat)}'.`
                );
            }

            stackOffset += 8;
        }

        emitter.emitWasmPushThread();
        emitter.emitWasm(SpiderOpcodes.local_get, newStackPtrVar);
        emitter.emitWasm(SpiderOpcodes.i32_store, 2, CatnipWasmStructThread.getMemberOffset("stack_ptr"));

        emitter.returnLocal(baseStackPtrVar);
        emitter.returnLocal(newStackPtrVar);

        for (const frameValue of frameValues)
            emitter.returnLocal(frameValue[0]);
    }

}