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

            dst.block.commands.push(...src.block.commands);

            for (const createdTransient of src.block.createdTransients)
                dst.block.addCreatedTransient(createdTransient);

            // Update inbound connections
            // Everything pointing at 'src' should now point at 'dst'
            for (const inInfo of src.in) {
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
            }

            // Check the script head too
            if (src.block.script.head === src.block) {
                CatnipCompilerLogger.assert(src.block.script === dst.block.script);
                src.block.script.head = dst.block;
            }

            // Update graph
            for (const inBlock of src.in) {
                if (inBlock !== dst) dst.in.push(inBlock);
            }

            // Update outbound connections
            dst.block.flow = src.block.flow;

            // Update graph
            for (const outInfo of src.out)
                outInfo.in[outInfo.in.indexOf(src)] = dst;

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

            if (blockInfo.block.commands.length === 0) {
                if (blockFlow.type === IR0ControlFlowType.Next && blockFlow.status === CatnipWasmEnumThreadStatus.RUNNING) {
                    // This is an empty node which just passes control to something else. It does not need to exist.
                    mergeBasicBlocks(blockInfo, graph.get(blockFlow.next)!);
                }
            }
        });

        return modified;
    }
}