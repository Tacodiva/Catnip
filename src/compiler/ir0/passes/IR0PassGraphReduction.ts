import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipCompilerLogger } from "../../CatnipCompilerLogger";
import { IR0Pass, IRType } from "../../IRPass";
import { IR0, IR0BasicBlockGraphNode } from "../IR0";
import { IR0ControlFlowType } from "../IR0ControlFlow";

export const IR0PassGraphReduction: IR0Pass = {
    type: IRType.IR0,
    priority: 0,

    execute: function (ir: IR0): boolean {
        const graph = ir.createBasicBlockGraph(false);

        function mergeBasicBlocks(dst: IR0BasicBlockGraphNode, src: IR0BasicBlockGraphNode) {
            CatnipCompilerLogger.assert(dst !== src);
            CatnipCompilerLogger.assert(dst.block.script === src.block.script);
            CatnipCompilerLogger.assert(dst.block.flow.type === IR0ControlFlowType.Next);
            CatnipCompilerLogger.assert(dst.out.includes(src));
            CatnipCompilerLogger.assert(src.in.includes(dst));

            dst.block.commands.push(...src.block.commands);

            // Merge the created and destroyed transients
            for (const createdTransient of src.block.createdTransients)
                dst.block.createTransient(createdTransient);

            for (const destroyedTransient of src.block.destroyedTransients)
                dst.block.destroyTransient(destroyedTransient);

            // Everything going into 'src' should now go into 'dst'
            {
                for (const inInfo of src.in) {
                    if (inInfo === dst) continue;

                    const inFlow = inInfo.block.flow;

                    switch (inFlow.type) {
                        case IR0ControlFlowType.Call:
                            CatnipCompilerLogger.assert(inFlow.next === src.block);
                            inFlow.next = dst.block;
                            break;

                        case IR0ControlFlowType.Condition:
                            CatnipCompilerLogger.assert(inFlow.pass === src.block || inFlow.fail === src.block);
                            if (inFlow.pass === src.block) inFlow.pass = dst.block;
                            if (inFlow.fail === src.block) inFlow.fail = dst.block;
                            break;

                        case IR0ControlFlowType.Next:
                            CatnipCompilerLogger.assert(inFlow.next === src.block);
                            inFlow.next = dst.block;
                            break;

                        case IR0ControlFlowType.Return:
                            throw new Error("Return blocks cannot be 'in'.");
                    }

                    // Update graph
                    inInfo.out[inInfo.out.indexOf(src)] = dst;
                    if (!dst.in.includes(inInfo)) dst.in.push(inInfo);
                }
            }

            // Update outbound connections, everything coming out of 'src' should now come out of 'dst'
            {
                dst.block.flow = src.block.flow;

                // Update graph
                dst.out = [...src.out];

                for (const outInfo of dst.out) {
                    outInfo.in[outInfo.in.indexOf(src)] = dst;
                }
            }

            // Update script head if we need to
            if (src.block.script.head === src.block)
                src.block.script.head = dst.block;

            // Goodbye src :3
            graph.delete(src.block);
        }

        let modified = false;

        ir.forEachBasicBlock(block => {
            const blockInfo = graph.get(block);
            const blockFlow = block.flow;

            if (blockInfo === undefined) return;

            if (blockInfo.in.length === 1) {
                // This block only has one inward edge, lets see if we can simplify.
                const inBlockInfo = blockInfo.in[0];
                const inBlockFlow = inBlockInfo.block.flow;

                // We can't merge a block with itself
                if (inBlockInfo.block === block) return;

                if (inBlockFlow.type === IR0ControlFlowType.Next &&
                    inBlockFlow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                    // We can merge this block and the inward block
                    mergeBasicBlocks(inBlockInfo, blockInfo);
                    modified = true;
                    return;
                }
            }

            if (blockInfo.block.commands.length === 0 && blockInfo.block.destroyedTransients.length === 0) {
                if (blockFlow.type === IR0ControlFlowType.Next && blockFlow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                    // This is an empty node which just passes control to something else. It does not need to exist.
                    mergeBasicBlocks(blockInfo, graph.get(blockFlow.next)!);
                    modified = true;
                    return;
                }
            }

            if (blockFlow.type === IR0ControlFlowType.Condition && blockFlow.pass === blockFlow.fail) {
                // If a condition does the same thing on pass or fail, we can get rid of the condition

                block.flow = {
                    type: IR0ControlFlowType.Next,
                    next: blockFlow.pass,
                    status: CatnipWasmEnumThreadStatus.RUNNING
                };

                modified = true;

                return;
            }
        });

        return modified;
    }
}