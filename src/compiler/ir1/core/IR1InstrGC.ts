import { SpiderLocalReference, SpiderOpcodes } from "wasm-spider";
import { CatnipWasmStructRuntime } from "../../../wasm-interop/CatnipWasmStructRuntime";
import { CatnipValueFormat } from "../../CatnipValueFormat";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipValueFormatUtils } from '../../CatnipValueFormatUtils';

export class IR1InstrGC extends IR1Instruction {

    public captureStack: CatnipValueFormat[];

    public constructor(captureStack: CatnipValueFormat[]) {
        super();
        this.captureStack = captureStack;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {
        // We only need to capture stuff up to the first garbage collectable item
        let firstCollectable = 0;
        for (; firstCollectable < this.captureStack.length; firstCollectable++) {
            if (CatnipValueFormatUtils.isGarbageCollectable(this.captureStack[firstCollectable]))
                break;
        }
        
        // If the capture stack is [A, B] we will pop them off in the order [B, A], hence the reverse order here
        const capturedStack: SpiderLocalReference[] = [];
        for (let i = this.captureStack.length - 1; i >= firstCollectable; i--) {
            const local = emitter.borrowLocal(this.captureStack[i]);
            emitter.emitWasm(SpiderOpcodes.local_set, local);
            capturedStack.push(local);
        }

        emitter.emitWasmPushRuntime();
        emitter.emitWasm(SpiderOpcodes.i32_load, 2, CatnipWasmStructRuntime.getMemberOffset("gc_requested"));

        emitter.emitWasmIf(
            emitter => {
                emitter.createGCFrame(false);
                emitter.emitWasmPushRuntime();
                emitter.emitWasmRuntimeFunctionCall("catnip_runtime_gc");
                emitter.restoreGCFrame();
            },
        );

        for (const local of capturedStack) {
            emitter.emitWasm(SpiderOpcodes.local_get, local);
            emitter.returnLocal(local);
        }
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`gc [${this.captureStack.map(CatnipValueFormatUtils.stringify).join(", ")}]`);
    }

}