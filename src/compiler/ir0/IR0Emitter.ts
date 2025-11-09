import { CatnipCommandList, CatnipInputOp } from "../../ops";
import { CatnipScript } from "../../runtime/CatnipScript";
import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { catnip_compiler_constant } from "../cast";
import { catnip_compiler_callback } from "../CatnipCompiler";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { IR0CmdCallback } from "./core/IR0CmdCallback";
import { IR0CmdRequestRedraw } from "./core/IR0CmdRequestRedraw";
import { IR0InputCallback } from "./core/IR0InputCallback";
import { IR0InputConst } from "./core/IR0InputConst";
import { IR0BasicBlock } from "./IR0BasicBlock";
import { IR0ControlFlow, IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0Command, IR0Input, IR0InputReference, IR0NodeArgument, IR0NodeArguments } from "./IR0Node";
import { IR0Script } from "./IR0Script";
import { IR0TriggerProcedure } from "./procedure/IR0TriggerProcedure";
import { SB3ToIR0Info } from "./SB3ToIR0Info";

export type IR0EmitterFunc = (emitter: IR0Emitter) => void;

export class IR0Emitter {

    public readonly ir0Script: IR0Script;
    public readonly sb3Script: CatnipScript;
    public block: IR0BasicBlock;

    public readonly conversionInfo: SB3ToIR0Info;

    public get compiler() { return this.ir0Script.ir.compiler; }
    public get project() { return this.compiler.project; }

    public constructor(conversionInfo: SB3ToIR0Info, script: IR0Script) {
        this.conversionInfo = conversionInfo;
        this.ir0Script = script;
        this.sb3Script = this.conversionInfo.getScriptSB3(this.ir0Script);
        this.block = this.ir0Script.head;
    }

    public emitAll() {
        if (this.block.isComplete) return;

        this.emitCommands(this.sb3Script.commands);
        this.completeBlock({
            type: IR0ControlFlowType.Return
        });
    }

    public emitInput(input: CatnipInputOp) {
        return input.type.generateIr(this, input.inputs);
    }

    public emitConst(value: catnip_compiler_constant, format?: CatnipValueFormat): IR0InputConst {
        return new IR0InputConst(value, format);
    }

    public emitCommands(commands: CatnipCommandList) {
        if (this.block.isComplete) return;

        for (const command of commands) {

            command.type.generateIr(this, command.inputs);

            if (this.block.isComplete) break;
        }
    }

    public emitCommand(inst: IR0Command) {
        if (this.block.isComplete) return;
        this.block.commands.push(inst);
    }

    public emitCallbackCommand(name: string, callback: catnip_compiler_callback, args: IR0NodeArguments<IR0NodeArgument>) {
        this.emitCommand(new IR0CmdCallback(name, callback, args));
    }

    public emitCallbackInput(name: string, callback: catnip_compiler_callback, args: IR0NodeArguments<IR0NodeArgument>, result: CatnipValueFormat): IR0InputCallback {
        return new IR0InputCallback(name, callback, args, result);
    }

    public emitRequestRedraw() {
        this.emitCommand(new IR0CmdRequestRedraw());
    }

    public emitReturn() {
        if (this.block.isComplete) return;
        this.completeBlock({ type: IR0ControlFlowType.Return });
    }

    public emitYield(status: CatnipWasmEnumThreadStatus = CatnipWasmEnumThreadStatus.YIELD) {
        if (this.block.isComplete) return;
        const nextBlock = new IR0BasicBlock(this.ir0Script);
        this.completeBlock({ type: IR0ControlFlowType.Next, status, next: nextBlock });
        this.block = nextBlock;
    }

    public emitFlow(block: IR0BasicBlock) {
        if (this.block.isComplete) return;
        this.completeBlock(block);
    }

    public emitLoopYield() {
        if (!this.ir0Script.trigger.isWarp) {
            this.emitYield();
        }
    }

    public emitCall(procedure: IR0Script, args: IR0Input[]) {
        if (this.block.isComplete) return;

        const nextBlock = new IR0BasicBlock(this.ir0Script);

        const procedureTrigger = procedure.trigger;
        CatnipCompilerLogger.assert(procedureTrigger instanceof IR0TriggerProcedure);
        CatnipCompilerLogger.assert(args.length === procedureTrigger.args.length);

        const argReferences: IR0InputReference[] = [];

        for (let i = 0; i < args.length; i++) {
            const procedureArg = procedureTrigger.args[i];
            argReferences[i] = new IR0InputReference(procedureArg.name, procedureArg.format, args[i]);
        }

        this.completeBlock({
            type: IR0ControlFlowType.Call,
            next: nextBlock,
            args: argReferences,
            procedure,
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

    public emitBlock(emitter: IR0EmitterFunc | null, fallbackFlow: IR0BasicBlock | IR0ControlFlow | null): IR0BasicBlock {
        const oldBlock = this.block;

        const newBlock = this.block = new IR0BasicBlock(this.ir0Script);

        if (emitter !== null) emitter(this);

        if (fallbackFlow !== null) {
            this.completeBlock(fallbackFlow);
        }

        this.block = oldBlock;

        return newBlock;
    }

    public emitInlineBlock(emitter: IR0EmitterFunc) {
        if (this.block.isComplete) return;

        const innerBlock = new IR0BasicBlock(this.ir0Script);
        this.completeBlock(innerBlock);
        this.block = innerBlock;

        emitter(this);

        const tailBlock = new IR0BasicBlock(this.ir0Script);
        this.completeBlock(tailBlock);
        this.block = tailBlock;
    }

    public emitCondition(condition: IR0Input, passEmitter: IR0EmitterFunc, failEmitter?: IR0EmitterFunc) {
        if (this.block.isComplete) return;

        const tail = new IR0BasicBlock(this.ir0Script);

        const pass = this.emitBlock(passEmitter, tail);
        const fail = this.emitBlock(failEmitter ?? null, tail);

        this.completeBlock({
            type: IR0ControlFlowType.Condition,
            condition: new IR0InputReference("condition", CatnipValueFormat.I32_BOOLEAN, condition),
            pass, fail
        });

        this.block = tail;
    }

    public emitTransientCreate(name: string, format: CatnipValueFormat): CatnipCompilerTransientVariable {
        return this.block.createTransient(name, format);
    }
}
