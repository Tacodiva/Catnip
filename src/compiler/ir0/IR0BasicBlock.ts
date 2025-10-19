import { CatnipWasmEnumThreadStatus } from "../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0Command, IR0Node } from "./IR0Node";
import { IR0GraphVisDotGenerator } from "./IR0GraphVisDotGenerator";
import { IR0ControlFlow, IR0ControlFlowType } from "./IR0ControlFlow";
import { IR0Logger } from "./IR0Logger";
import { CatnipCompilerTransientVariable } from "../CatnipCompilerTransientVariable";



export class IR0BasicBlock {
    public commands: IR0Command[];

    // A list of transient variables that this block "creates"
    public createdTransients: CatnipCompilerTransientVariable[];

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

    public constructor(instructions: IR0Command[] = [], flow: IR0ControlFlow | null = null) {
        this.commands = instructions;
        this._flow = flow;
        this.createdTransients = [];
    }

    public forEachNode(iterator: (node: IR0Node) => void): void {
        function iterate(node: IR0Node) {
            iterator(node);

            for (const arg of Object.values(node.args))
                iterate(arg.value);
        }

        this.commands.forEach(iterate);

        switch (this.flow.type) {
            case IR0ControlFlowType.Call:
                this.flow.args.forEach(iterate);
                break;
            case IR0ControlFlowType.Condition:
                iterate(this.flow.condition);
                break;
        }
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

                    const conditionNodeName = flow.condition.createGraphVisNode(generator);
                    generator.writeValueEdge(conditionNodeName, info.finalNode, "condition");
                    break;
                }
                case IR0ControlFlowType.Call: {
                    generator.writeLine(`${info.finalNode} [shape=diamond, label="Call"]`);

                    for (const arg of flow.args) {
                        const argNodeName = arg.createGraphVisNode(generator);
                        generator.writeValueEdge(argNodeName, info.finalNode, "condition");
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

}
