import { SpiderNumberType, SpiderOpcodes } from "wasm-spider";
import { CatnipCompilerWasmEmitter } from "../../wasm/CatnipCompilerWasmEmitter";
import { IR1Instruction } from "../IR1Instruction";
import { IR1StringificationContext } from "../IR1StringificationContext";
import { CatnipWasmPtrThread } from "../../../wasm-interop/CatnipWasmStructThread";
import { BroadcastSubsystem } from "../../subsystems/BroadcastSubsystem";
import { CatnipWasmEnumEventSource } from "../../../wasm-interop/CatnipWasmEnumEventSource";
import { CatnipValueFormat } from "../../CatnipValueFormat";

export class IR1InstrEventsBroadcast extends IR1Instruction {

    public readonly broadcastName: string | null;
    public readonly waitThreads: boolean;

    public constructor(broadcastName: string | null, pushThreadList: boolean) {
        super();
        this.broadcastName = broadcastName;
        this.waitThreads = pushThreadList;
    }

    public emitWasm(emitter: CatnipCompilerWasmEmitter): void {

        const broadcastSubsystem = emitter.module.getSubsystem(BroadcastSubsystem);

        const broadcastNameVariable = emitter.borrowLocal(CatnipValueFormat.I32_HSTRING);

        if (this.broadcastName === null) {
            emitter.emitWasm(SpiderOpcodes.local_tee, broadcastNameVariable);
        }

        if (this.waitThreads) {
            emitter.emitWasmPushThread();
        } else {
            emitter.emitWasmPushNumber(SpiderNumberType.i32, 0);
        }

        if (this.broadcastName === null) {
            emitter.emitWasm(
                SpiderOpcodes.call,
                broadcastSubsystem.getGenericBroadcastFunction()
            );
        } else {
            emitter.emitWasm(
                SpiderOpcodes.call,
                broadcastSubsystem.getBroadcastFunction(this.broadcastName)
            );
        }

        const eventFunction = emitter.module.getEventFunction("PROJECT_BROADCAST");

        if (eventFunction !== null) {
            // We also need to trigger the event
            emitter.emitWasmPushNumber(SpiderNumberType.i32, CatnipWasmEnumEventSource.INTERNAL);
            
            if (this.broadcastName === null) {
                emitter.emitWasm(SpiderOpcodes.local_get, broadcastNameVariable);
            } else {
                emitter.emitWasmPushString(this.broadcastName);
            }

            emitter.emitWasm(SpiderOpcodes.call, eventFunction);
        }

        emitter.returnLocal(broadcastNameVariable);
    }

    public stringify(ctx: IR1StringificationContext): void {
        ctx.writeLine(`broadcast ${this.broadcastName ?? "[dynamic]"} (threads = ${this.waitThreads})`);
    }
}