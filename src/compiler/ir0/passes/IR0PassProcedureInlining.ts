
import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { CatnipCompilerTransientVariable } from "../../CatnipCompilerTransientVariable";
import { IR0Pass, IRType } from "../../IRPass";
import { IR0CmdTransientSet } from "../core/IR0CmdTransientSet";
import { IR0InputTransientGet } from "../core/IR0InputTransientGet";
import { IR0, IR0CallGraphNode } from "../IR0";
import { IR0BasicBlock } from "../IR0BasicBlock";
import { IR0CloneContext } from "../IR0CloneContext";
import { IR0ControlFlow, IR0ControlFlowCall, IR0ControlFlowType } from "../IR0ControlFlow";
import { IR0Input, IR0InputReference, IR0Node } from "../IR0Node";
import { IR0Script, IR0ScriptInfo } from "../IR0Script";
import { IR0InputProcedureArgument } from "../procedure/IR0InputProcedureArgument";

function tarjan(graph: Map<IR0Script, IR0CallGraphNode>): Map<IR0CallGraphNode, Set<IR0CallGraphNode>> {
    const groups: Set<IR0CallGraphNode>[] = [];

    interface NodeInfo {
        node: IR0CallGraphNode;
        index: number;
        lowlink: number;
        onStack: boolean;
    }

    // Implementation stolen from Wikipedia haha
    // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm

    const nodes: Map<IR0CallGraphNode, NodeInfo> = new Map();

    let index = 0;
    const stack: NodeInfo[] = [];

    function strongConnect(vNode: IR0CallGraphNode): NodeInfo {
        CatnipCompilerLogger.assert(!nodes.has(vNode));

        const v: NodeInfo = {
            onStack: true,
            index,
            lowlink: index,
            node: vNode
        };

        ++index;
        stack.push(v);

        for (const wNode of v.node.calls) {
            let w = nodes.get(wNode.node);

            if (w === undefined) {
                w = strongConnect(wNode.node);
                v.lowlink = Math.min(v.lowlink, w.lowlink);
            } else if (w.onStack) {
                v.lowlink = Math.min(v.lowlink, w.index);
            }
        }

        if (v.lowlink === v.index) {
            const connected: Set<IR0CallGraphNode> = new Set();

            let w: NodeInfo;
            do {
                w = stack.pop()!;
                w.onStack = false;
                connected.add(w.node);
            } while (w !== v);

            groups.push(connected);
        }

        return v;
    }

    for (const node of graph.values()) {
        if (!nodes.has(node)) strongConnect(node);
    }

    const groupsMap: Map<IR0CallGraphNode, Set<IR0CallGraphNode>> = new Map();

    for (const group of groups) {
        for (const node of group) {
            groupsMap.set(node, group);
        }
    }

    return groupsMap;
}

export const IR0PassProcedureInlining: IR0Pass = {
    type: IRType.IR0,

    priority: 0,

    execute: function (ir: IR0, iteration: number): boolean {
        // We only want to run this pass once
        if (iteration !== 0) return false;

        const callGraph = ir.createCallGraph();
        const callGraphGroups = tarjan(callGraph);

        let modified = false;

        const attemptedInlining: Set<IR0CallGraphNode> = new Set();

        function tryInline(callingNode: IR0CallGraphNode) {
            if (attemptedInlining.has(callingNode)) return;
            attemptedInlining.add(callingNode);

            for (const callInfo of callingNode.calls)
                tryInline(callInfo.node);

            for (const calledInfo of callingNode.calls) {
                const calledNode = calledInfo.node;

                const callingBlock = calledInfo.callerBlock;
                const callingFlow = callingBlock.flow;

                CatnipCompilerLogger.assert(callingFlow.type === IR0ControlFlowType.Call);
                CatnipCompilerLogger.assert(callingFlow.procedure === calledNode.script);

                // Don't inline recursive functions
                if (callingNode !== undefined && calledNode !== undefined) {
                    const callGroup = callGraphGroups.get(callingNode)!;
                    // A function call is "recursive" if it is in the same strongly connected group as us
                    if (callGroup.has(calledNode)) continue;
                }

                // We are going to inline!
                // TODO Some kind of heuristic here to check if we wanna inline, for now tho
                //   we just inling everything

                modified = true;

                // First, we need to move all the parameters into transient variables.
                const argumentTransients: CatnipCompilerTransientVariable[] = [];

                for (const argument of callingFlow.args) {
                    const argumentTransient = callingBlock.createNewTransient(`${argument.name}_inline`, argument.requiredFormat);
                    argumentTransients.push(argumentTransient);
                    callingBlock.commands.push(new IR0CmdTransientSet(argumentTransient, argument.input));
                }
                
                // This is where "returns" will now flow to
                const returnLocation = callingFlow.next;

                // Now, we need to clone everything into this script
                const cloneCtx = new IR0CloneContext(callingBlock.script);
                const clonedScriptHead = calledNode.script.head.clone(cloneCtx);

                // We now need to go through all the cloned blocks and replace the return nodes and the 
                //  procedure argument gets
                const visited: Set<IR0BasicBlock> = new Set();

                function visit(block: IR0BasicBlock) {
                    if (visited.has(block)) return;
                    visited.add(block);

                    function visitInput(inputReference: IR0InputReference) {
                        visitNode(inputReference.input);

                        if (inputReference.input instanceof IR0InputProcedureArgument) {
                            const index = inputReference.input.index;
                            inputReference.input = new IR0InputTransientGet(argumentTransients[index]);
                        }
                    }

                    function visitNode(node: IR0Node) {
                        for (const inputRef of Object.values(node.args))
                            visitInput(inputRef);
                    }

                    block.forEachRootNode(visitNode, visitInput);

                    if (block.flow.type === IR0ControlFlowType.Return) {
                        // Return now branches to where we would have returned to
                        block.flow = {
                            type: IR0ControlFlowType.Next,
                            status: CatnipWasmEnumThreadStatus.RUNNING,
                            next: returnLocation
                        };

                        // Also destroy all of our borrowed transients
                        for (const argTransient of argumentTransients)
                            block.destroyTransient(argTransient);
                        
                    } else {
                        IR0ControlFlow.forEachBlock(block.flow, visit);
                    }
                }

                visit(clonedScriptHead);

                // Finally, replace our call with a branch
                callingBlock.flow = {
                    type: IR0ControlFlowType.Next,
                    status: CatnipWasmEnumThreadStatus.RUNNING,
                    next: clonedScriptHead
                };
            }
        }

        for (const graphNode of callGraph.values())
            tryInline(graphNode);

        return modified;
    }
};