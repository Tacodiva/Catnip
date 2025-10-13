import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0Command, IR0Script, IR0Input } from "./IR0";
import { IR0ControlFlow, IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0Logger } from "./IR0Logger";
import { CatnipCommandList, CatnipInputOp } from "../../ops";

export type IR0EmitterFunc = (emitter: IR0Emitter) => void;

export class IR0Emitter {

    public readonly script: IR0Script;
    public block: IR0BasicBlock;

    public get compiler() { return this.script.ir.compiler; }

    public constructor(script: IR0Script) {
        this.script = script;
        this.block = this.script.head;
    }

    private assertIncomplete() {
        IR0Logger.assert(!this.block.isComplete, true, "Block is already completed.");
    }

    public emitInput(input: CatnipInputOp) {
        return input.type.generateIr(this, input.inputs);
    }

    public emitCommands(commands: CatnipCommandList) {
        this.assertIncomplete();

        for (const command of commands) {

            command.type.generateIr(this, command.inputs);

            if (this.block.isComplete) break;
        }
    }

    public emitCommand(inst: IR0Command) {
        this.assertIncomplete();
        this.block.commands.push(inst);
    }

    public emitReturn() {
        this.assertIncomplete();
        this.completeBlock({ type: IR0ControlFlowType.Return });
    }

    public emitYield(status: CatnipWasmEnumThreadStatus = CatnipWasmEnumThreadStatus.YIELD) {
        this.assertIncomplete();
        const nextBlock = new IR0BasicBlock();
        this.completeBlock({ type: IR0ControlFlowType.Next, status, next: nextBlock });
        this.block = nextBlock;
    }

    public emitFlow(block: IR0BasicBlock) {
        this.assertIncomplete();
        this.completeBlock(block);
    }

    public emitLoopYield() {
        if (!this.script.isWarp) {
            this.emitYield();
        } else if (this.compiler.config.enable_warp_timer) {
            // TODO Warp timer
        }
    }

    public emitCall(procedure: IR0Script, args: IR0Input[]) {
        this.assertIncomplete();

        const nextBlock = new IR0BasicBlock();

        this.completeBlock({
            type: IR0ControlFlowType.Call,
            next: nextBlock,
            procedure, args
        });

        this.block = nextBlock;
    }

    public completeBlock(fallbackFlow: IR0BasicBlock | IR0ControlFlow): IR0BasicBlock {
        if (!this.block.isComplete) {
            if (fallbackFlow instanceof IR0BasicBlock) {
                fallbackFlow = { type: IR0ControlFlowType.Next, next: fallbackFlow, status: CatnipWasmEnumThreadStatus.RUNNING };
            }

            this.block.flow = fallbackFlow;
        }

        return this.block;
    }

    public emitBlock(emitter: IR0EmitterFunc, fallbackFlow: IR0BasicBlock | IR0ControlFlow | null): IR0BasicBlock {
        const oldBlock = this.block;

        const newBlock = this.block = new IR0BasicBlock();

        emitter(this);

        if (fallbackFlow !== null) {
            this.completeBlock(fallbackFlow);
        }

        this.block = oldBlock;

        return newBlock;
    }

    public emitInlineBlock(emitter: IR0EmitterFunc) {
        this.assertIncomplete();

        const innerBlock = new IR0BasicBlock();
        this.completeBlock(innerBlock);
        this.block = innerBlock;

        emitter(this);

        const tailBlock = new IR0BasicBlock();
        this.completeBlock(tailBlock);
        this.block = tailBlock;
    }

    public emitCondition(condition: IR0Input, passEmitter: IR0EmitterFunc, failEmitter: IR0EmitterFunc) {
        this.assertIncomplete();

        const tail = new IR0BasicBlock();

        const pass = this.emitBlock(passEmitter, tail);
        const fail = this.emitBlock(failEmitter, tail);

        this.completeBlock({
            type: IR0ControlFlowType.Condition,
            condition, pass, fail
        });

        this.block = tail;
    }
}
