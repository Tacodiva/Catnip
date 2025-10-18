import { SpiderNumberType } from "wasm-spider";
import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { CatnipValueFormatUtils } from "../CatnipValueFormatUtils";
import { IR0GraphVisDotGenerator, IR0Input, IR0Command, IR0Script, IR0Node } from "../ir0/IR0";
import { IR0BasicBlock } from "../ir0/IR0BasicBlock";
import { IR0ControlFlowType, IR0ControlFlow } from "../ir0/IR0ControlFlow";
import { BasicBlockInfo, FunctionInfo, IR0ToIR1Info, ScriptInfo } from "../ir0/IR0ToIR1Info";
import { IR1InstrCall, IR1InstrBlock, IR1InstrBr, IR1InstrLoop, IR1InstrIf, IR1InstrTerminate, IR1InstrReturn, IR1InstrReturnTo } from "./instructions/blah";
import { IR1InstrYield } from "./instructions/IR1InstrYield";
import { IR1InstrCast } from "./instructions/IR1InstrCast";
import { IR1InstrPushFunctionIndex } from "./instructions/IR1InstrPushFunctionIndex";
import { IR1InstrStackFrame } from "./instructions/IR1InstrStackFrame";
import { IR1Script, IR1, IR1Instruction } from "./IR1";
import { IR1ExternalValue, IR1ExternalValueType } from "./IR1ExternalValue";
import { IR1ExternalValueSourceType, IR1Function } from "./IR1Function";
import { IR1Logger } from "./IR1Logger";
import { IR1InstrPushExternalValue } from "./instructions/IR1InstrPushExternalValue";

export class IR1Emitter {
    public readonly conversionInfo: IR0ToIR1Info;

    public readonly script: ScriptInfo;

    public get ir0Script() { return this.script.ir0; }
    public get ir1Script() { return this.script.ir1; }

    public get compiler() { return this.script.ir0.ir.compiler; }

    public constructor(script: IR0Script, conversionInfo: IR0ToIR1Info) {
        this.conversionInfo = conversionInfo;
        this.script = this.conversionInfo.getScriptInfo(script);
    }

    public emitAll(): void {
        for (const func of this.script.functions)
            this.emitFunction(func);
    }

    private emitFunction(func: FunctionInfo): void {
        const entrypoint = this.conversionInfo.getBasicBlockInfo(func.ir0);

        IR1Logger.assert(entrypoint.isEntrypoint);

        enum ContainingSyntaxType {
            BlockFollowedBy,
            LoopHeadedBy,
            IfElseThen
        }

        interface ContainingSyntax {
            type: ContainingSyntaxType,
            block: BasicBlockInfo | null
        };

        class Context {
            public frames: ContainingSyntax[];
            public fallthrough: BasicBlockInfo | null;

            public constructor(frames?: ContainingSyntax[], fallthrough?: BasicBlockInfo | null) {
                this.frames = frames ?? [];
                this.fallthrough = fallthrough ?? null;
            }

            public inside(frame: ContainingSyntax): Context {
                return new Context([frame, ...this.frames], this.fallthrough);
            }

            public withFallthrough(fallthrough: BasicBlockInfo): Context {
                return new Context([...this.frames], fallthrough);
            }

            public getBrIndex(target: BasicBlockInfo): number {

                for (let i = 0; i < this.frames.length; i++) {
                    if (this.frames[i].block === target) return i;
                }

                throw new Error("Target label not in context.");
            }

            public clone(): Context {
                return new Context([...this.frames], this.fallthrough)
            }
        }

        // We're gonna do this the stupid functional way for now but i'll go back and change it

        function doNode(block: BasicBlockInfo, ctx: Context): IR1Instruction[] {

            // Sanity check, every block we immediatly dominate should belong to this function
            IR1Logger.assert(block.immediateDominates.findIndex(a => a.func !== func) === -1);

            const selectedChildren = block.immediateDominates
                .filter(x => x.isMerge)
                .sort((x, y) => x.reversePostorderIndex - y.reversePostorderIndex);

            if (block.isLoopHead) {

                const loopCtx = ctx.inside({
                    type: ContainingSyntaxType.LoopHeadedBy,
                    block
                });

                const loopBody = nodeWithin(block, selectedChildren, null, loopCtx);

                return [new IR1InstrLoop(loopBody)];
            }

            return nodeWithin(block, selectedChildren, null, ctx);
        }

        const nodeWithin = (
            x: BasicBlockInfo,
            children: BasicBlockInfo[],
            followMark: BasicBlockInfo | null,
            ctx: Context
        ): IR1Instruction[] => {

            if (children.length !== 0) {

                // If we have a pending "follow" mark (a label after a block), insert a Block frame
                // and proceed with the rest.
                if (followMark !== null) {
                    const blockCtx = ctx.inside({
                        type: ContainingSyntaxType.BlockFollowedBy,
                        block: followMark
                    });
                    const blockBody = nodeWithin(x, children, null, blockCtx);
                    return [new IR1InstrBlock(blockBody)];
                }

                const y = children[0];
                const rest = children.slice(1);

                const left = nodeWithin(
                    x, rest, y, ctx.withFallthrough(y)
                );

                const right = doNode(y, ctx);

                return [...left, ...right];
            }

            // If no children remain but we still carry a followMark, wrap this in a block.
            // We don't need to do that if the block will generate an if because we can just br to the end of the if
            if (followMark !== null && !generatesIf(x)) {
                // TODO This is code duplication

                const blockCtx = ctx.inside({
                    type: ContainingSyntaxType.BlockFollowedBy,
                    block: followMark
                });
                const blockBody = nodeWithin(x, children, null, blockCtx);
                return [new IR1InstrBlock(blockBody)];
            }


            const body: IR1Instruction[] = [];

            for (const command of x.block.commands) {
                this.emitIR0(command, body);
            }

            const flow = x.block.flow;

            switch (flow.type) {
                case IR0ControlFlowType.Next: {

                    const next = this.conversionInfo.getBasicBlockInfo(flow.next);

                    if (flow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                        body.push(...doBranch(x, next, ctx));
                    } else {
                        // If we yield to a function, it should have been made an entrypoint in a previous pass
                        CatnipCompilerLogger.assert(next.isEntrypoint);
                        this.prepareInternalCall(next.func.ir1, body);
                        body.push(new IR1InstrYield(next.func.ir1, flow.status));
                    }

                    break;
                }

                case IR0ControlFlowType.Condition: {

                    this.emitIR0Input(flow.condition, CatnipValueFormat.I32_BOOLEAN, body);

                    const branchCtx = ctx.inside({
                        type: ContainingSyntaxType.IfElseThen,
                        block: followMark
                    });

                    const passBranch = doBranch(x, this.conversionInfo.getBasicBlockInfo(flow.pass), branchCtx.clone());
                    const failBranch = doBranch(x, this.conversionInfo.getBasicBlockInfo(flow.fail), branchCtx.clone());

                    body.push(new IR1InstrIf(passBranch, failBranch));
                    break;
                }

                case IR0ControlFlowType.Return: {
                    if (x.func.script.ir1.trigger.isTopLevel) {
                        body.push(new IR1InstrTerminate());
                    } else {
                        if (x.func.script.isYielding) {
                            body.push(new IR1InstrReturnTo());
                        } else {
                            body.push(new IR1InstrReturn());
                        }
                    }
                    break;
                }

                case IR0ControlFlowType.Call: {
                    const calledProcedureInfo = this.conversionInfo.getScriptInfo(flow.procedure);
                    const calledFunction = calledProcedureInfo.entrypoint.ir1;

                    const nextBlockInfo = this.conversionInfo.getBasicBlockInfo(flow.next);

                    if (calledProcedureInfo.isYielding) {
                        // This will have been marked as an entrypoint in a previous pass
                        IR1Logger.assert(nextBlockInfo.isEntrypoint);

                        // We need to setup the stack for returning to this function
                        this.prepareInternalCall(nextBlockInfo.func.ir1, body);
                    }

                    // If this were a function, it would be called "prepareExternalCall"
                    {
                        for (const calledExternalValue of calledFunction.externalValues) {
                            switch (calledExternalValue.type) {
                                case IR1ExternalValueType.PROCEDURE_ARGUMENT:
                                    this.emitIR0Input(
                                        flow.args[calledExternalValue.index],
                                        IR1ExternalValue.getFormat(calledExternalValue), 
                                        body
                                    );
                                    break;
                                case IR1ExternalValueType.RETURN_LOCATION:
                                    IR1Logger.assert(nextBlockInfo.isEntrypoint);
                                    IR1Logger.assert(calledProcedureInfo.isYielding);
                                    body.push(new IR1InstrPushFunctionIndex(nextBlockInfo.func.ir1));
                                    break;
                            }
                        }

                        this.stackifyArguments(calledFunction, body);
                    }

                    if (calledProcedureInfo.isYielding) {
                        // TODO If calledProcedureInfo.isYielding then this is a tail call
                        body.push(new IR1InstrCall(calledFunction));
                    } else {
                        body.push(new IR1InstrCall(calledFunction));
                        body.push(...doBranch(x, this.conversionInfo.getBasicBlockInfo(flow.next), ctx));
                    }
                }

            }

            return body;
        }

        const doBranch = (from: BasicBlockInfo, to: BasicBlockInfo, ctx: Context): IR1Instruction[] => {

            if (from.func !== to.func) {
                // If we're branching to a different function, the target block should that function's entrypoint
                CatnipCompilerLogger.assert(to.isEntrypoint);
                const body: IR1Instruction[] = [];

                this.prepareInternalCall(to.func.ir1, body);
                body.push(new IR1InstrCall(to.func.ir1));

                return body;
            }

            if (ctx.fallthrough === to) {
                return [];
            }

            const isBackedge = from.reversePostorderIndex >= to.reversePostorderIndex;

            // If this is a backedge, the target should be a loop head
            IR1Logger.assert(!isBackedge || to.isLoopHead);

            if (isBackedge || to.isMerge) {
                return [new IR1InstrBr(ctx.getBrIndex(to))];
            }

            return doNode(to, ctx);
        }

        function generatesIf(block: BasicBlockInfo) {
            return block.block.flow.type === IR0ControlFlowType.Condition;
        }

        func.ir1.body = doNode(entrypoint, new Context());
    }

    // Sets up the WASM stack or thread stack in preperation for a call to a function that is within this script.
    //   We need to pass any external values the function needs to it.
    private prepareInternalCall(to: IR1Function, body: IR1Instruction[]) {
        for (const externalValue of to.externalValues) {
            body.push(new IR1InstrPushExternalValue(externalValue));
        }
        this.stackifyArguments(to, body);
    }

    private stackifyArguments(to: IR1Function, body: IR1Instruction[]) {
        if (to.externalValueSource === IR1ExternalValueSourceType.STACK && to.externalValues.length !== 0) {
            body.push(new IR1InstrStackFrame(
                to.externalValues.map(f => IR1ExternalValue.getFormat(f))
            ));
        }
    }

    private emitIR0Input(input: IR0Input, expectedFormat: CatnipValueFormat, body: IR1Instruction[]): void {
        input.requestResultFormat(expectedFormat);

        this.emitIR0(input, body);

        const resultFormat = input.getResultFormat();

        if (!CatnipValueFormatUtils.isAlways(resultFormat, expectedFormat)) {
            body.push(new IR1InstrCast(resultFormat, expectedFormat));
        }
    }

    private emitIR0(node: IR0Node, body: IR1Instruction[]): void {
        for (const argName in node.args) {
            const arg = node.args[argName];
            this.emitIR0Input(arg.value, arg.format, body);
        }

        const emitted = node.emitIR1(this);

        if (Array.isArray(emitted)) body.push(...emitted);
        else body.push(emitted);
    }
}
