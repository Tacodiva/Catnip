import { CatnipWasmEnumThreadStatus } from "../../../wasm-interop/CatnipWasmEnumThreadStatus";
import { IR0Pass, IRType } from "../../IRPass";
import { IR0 } from "../IR0";
import { IR0ControlFlowType } from "../IR0ControlFlow";

export const IR0PassDeadBranchElimination: IR0Pass = {
    type: IRType.IR0,
    priority: 0,

    execute: function (ir: IR0): boolean {
        let modified = false;

        ir.forEachBasicBlock(block => {
            const flow = block.flow;

            if (flow.type !== IR0ControlFlowType.Condition) return;

            const conditionResult = flow.condition.getResult();

            if (!conditionResult.isConstant) return;

            const conditionValue = conditionResult.asConstantBoolean();

            const branchToKeep = conditionValue ? flow.pass : flow.fail;

            block.flow = {
                type: IR0ControlFlowType.Next,
                status: CatnipWasmEnumThreadStatus.RUNNING,
                next: branchToKeep
            };

            modified = true;
        });

        return modified;
    }
}