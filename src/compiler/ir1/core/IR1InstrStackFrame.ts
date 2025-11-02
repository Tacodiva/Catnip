import { SpiderLocalVariableReference, SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { VALUE_STRING_UPPER } from "../../../wasm-interop/CatnipWasmStructValue";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../../CatnipValueFormatUtils";
import { CatnipCompilerWasmEmitStackFrame, CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
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

        const frame: CatnipCompilerWasmEmitStackFrame = [];

        // The frame is reversed because we have pushed the values onto the stack in order.
        //  If a function takes [A, B, C], then that will be the WASM stack. We will pop the items
        //  in the order [C, B, A], so the stack is stored in reverse.
        for (const format of [...this.frame].reverse()) {
            const local = emitter.borrowLocal(format);
            emitter.emitWasm(SpiderOpcodes.local_set, local);
            frame.push({local, format});
        }

        emitter.emitPushFrame(frame);

        for (const frameValue of frame)
            emitter.returnLocal(frameValue.local);
    }

}