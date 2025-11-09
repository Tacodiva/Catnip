import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../CatnipCompilerLogger";
import { CatnipCompilerStage } from "../CatnipCompilerStage";
import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";
import { CatnipValueFormat } from "../CatnipValueFormat";
import { IR0CloneContext } from "./IR0CloneContext";
import { IR0ControlFlow, IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0Logger } from "./IR0Logger";
import { IR0Command, IR0InputReference, IR0Node } from "./IR0Node";
import { IR0Script } from "./IR0Script";

export class IR0BasicBlock {
    public readonly script: IR0Script;

    public commands: IR0Command[];

    // Lists of transient variables that this block "creates" and "destroys". This operation doesn't really translate to anthing
    //  in the WASM, but it makes the scope of the transients definite, as they must be created and destroyed at some point.
    // This helps with analysis. Transients are not destroyed in the case of an infinite loop where the whole loop uses the transient. 

    // Transients created right before the begining of this block
    private _createdTransients: CatnipCompilerTransientVariable[];
    public get createdTransients(): readonly CatnipCompilerTransientVariable[] { return this._createdTransients; }

    // Transients destroyed right after the end of this block
    private _destroyedTransients: CatnipCompilerTransientVariable[];
    public get destroyedTransients(): readonly CatnipCompilerTransientVariable[] { return this._destroyedTransients; }

    // The 'flow' of this block is what happens when all the commands in the block are completed.
    private _flow: IR0ControlFlow | null;

    public get flow(): IR0ControlFlow {
        if (this._flow === null) throw new Error("Basic block is incomplete. Flow not set.");
        return this._flow;
    }

    public set flow(flow: IR0ControlFlow) {
        this._flow = flow;
    }

    public get isComplete(): boolean {
        return this._flow !== null;
    }

    public constructor(script: IR0Script, instructions: IR0Command[] = [], flow: IR0ControlFlow | null = null) {
        this.script = script;
        this.commands = instructions;
        this._flow = flow;
        this._createdTransients = [];
        this._destroyedTransients = [];
    }

    public createNewTransient(name: string, format: CatnipValueFormat): CatnipCompilerTransientVariable {
        const transient = new CatnipCompilerTransientVariable(name, format);
        this.createTransient(transient);
        return transient;
    }

    public createTransient(transient: CatnipCompilerTransientVariable): void {
        this.script.ir.compiler.assertStageBefore(CatnipCompilerStage.IR0_IR1_PREPASS);
        // Transients must always be created exactly once.
        CatnipCompilerLogger.assert(!this._createdTransients.includes(transient));
        this._createdTransients.push(transient);
    }

    public destroyTransient(transient: CatnipCompilerTransientVariable): void {
        this.script.ir.compiler.assertStageBefore(CatnipCompilerStage.IR0_IR1_PREPASS);
        if (this._destroyedTransients.includes(transient)) return;
        this._destroyedTransients.push(transient);
    }

    public forEachRootNode(
        iterateCommand: (node: IR0Command) => void,
        iterateInput: (node: IR0InputReference) => void
    ): void {
        this.commands.forEach(iterateCommand);
        IR0ControlFlow.forEachInput(this.flow, iterateInput);
    }

    public forEachNode(iterator: (node: IR0Node) => void): void {
        function iterate(node: IR0Node) {
            iterator(node);

            for (const arg of Object.values(node.args))
                iterate(arg.input);
        }

        this.forEachRootNode(iterate, inputRef => iterate(inputRef.input));
    }

    public createGraphVisNode(generator: IR0GraphVisDotGenerator): string {
        IR0Logger.assert(!generator.blocks.has(this));

        const clusterName = generator.getName();

        generator.writeLine(`subgraph cluster_${clusterName} {`);
        generator.incrementIndentation();

        let firstNode: string | null = null;
        let lastNode: string | null = null;

        for (const instruction of this.commands) {

            const instructionNodeName = instruction.createGraphVisNode(generator);

            if (firstNode === null) {
                firstNode = instructionNodeName;
            }

            if (lastNode !== null)
                generator.writeExecutionEdge(lastNode, instructionNodeName);

            lastNode = instructionNodeName;
        }

        const finalNode = generator.getName();

        if (lastNode !== null)
            generator.writeExecutionEdge(lastNode, finalNode);

        if (firstNode === null) firstNode = finalNode;

        generator.blocks.set(this, { firstNode, clusterName, finalNode });

        generator.decrementIndentation();
        generator.writeLine(`}`);

        return firstNode;
    }

    public linkGraphVisNode(generator: IR0GraphVisDotGenerator) {
        const info = generator.blocks.get(this)!;

        generator.writeLine(`subgraph cluster_${info.clusterName} {`);
        generator.incrementIndentation();

        function getLink(block: IR0BasicBlock) {
            return generator.blocks.get(block)!.firstNode;
        }

        if (!this.isComplete) {
            generator.writeLine(`${info.finalNode} [shape=diamond, label="Incomplete!"]`);
        } else {
            const flow = this.flow;

            switch (flow.type) {
                case IR0ControlFlowType.Return:
                    generator.writeLine(`${info.finalNode} [shape=diamond, label="Return"]`);
                    break;
                case IR0ControlFlowType.Next: {
                    generator.writeLine(`${info.finalNode} [shape=diamond, label="Next"]`);
                    const nextNodeName = getLink(flow.next);
                    if (flow.status !== CatnipWasmEnumThreadStatus.RUNNING) {
                        generator.writeExecutionEdge(info.finalNode, nextNodeName, `${CatnipWasmEnumThreadStatus[flow.status]}`);
                    } else {
                        generator.writeExecutionEdge(info.finalNode, nextNodeName);
                    }
                    break;
                }
                case IR0ControlFlowType.Condition: {
                    generator.writeLine(`${info.finalNode} [shape=diamond, label="Condition"]`);

                    const passNodeName = getLink(flow.pass);
                    const failNodeName = getLink(flow.fail);
                    generator.writeExecutionEdge(info.finalNode, passNodeName, "Pass");
                    generator.writeExecutionEdge(info.finalNode, failNodeName, "Fail");

                    const conditionNodeName = flow.condition.input.createGraphVisNode(generator);
                    generator.writeValueEdge(conditionNodeName, info.finalNode, flow.condition.name);
                    break;
                }
                case IR0ControlFlowType.Call: {
                    generator.writeLine(`${info.finalNode} [shape=diamond, label="Call"]`);

                    for (const arg of flow.args) {
                        const argNodeName = arg.input.createGraphVisNode(generator);
                        generator.writeValueEdge(argNodeName, info.finalNode, arg.name);
                    }

                    const nextNodeName = getLink(flow.next);
                    const returnScriptInfo = generator.getScriptInfo(flow.procedure);

                    generator.writeExecutionEdge(info.finalNode, nextNodeName, "Return");
                    generator.writeEdge(info.finalNode, returnScriptInfo.triggerNode, `color=blue label="Call" lhead="cluster_${returnScriptInfo.clusterName}"`);

                }
            }
        }

        generator.decrementIndentation();
        generator.writeLine(`}`);
    }

    public clone(ctx: IR0CloneContext): IR0BasicBlock {
        const clone = new IR0BasicBlock(ctx.dstScript, [], null);

        for (const command of this.commands)
            clone.commands.push(command.clone(ctx));

        for (const transient of this._createdTransients)
            clone._createdTransients.push(ctx.getTransient(transient));

        for (const transient of this._destroyedTransients)
            clone._destroyedTransients.push(ctx.getTransient(transient));

        ctx.blocks.set(this, clone);

        clone.flow = IR0ControlFlow.clone(this.flow, ctx);
        return clone;
    }

}
