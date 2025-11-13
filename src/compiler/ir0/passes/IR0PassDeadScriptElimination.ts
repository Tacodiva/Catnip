import { IR0Pass, IRType } from "../../IRPass";
import { IR0 } from "../IR0";
import { IR0Script } from "../IR0Script";
import { IR0TriggerProcedure } from "../procedure/IR0TriggerProcedure";

export const IR0PassDeadScriptElimination: IR0Pass = {
    type: IRType.IR0,
    priority: 0,

    execute: function (ir: IR0): boolean {

        const callGraph = ir.createCallGraph();
        const reachableScripts: Set<IR0Script> = new Set();

        function visitScript(script: IR0Script): void {
            if (reachableScripts.has(script)) return;

            reachableScripts.add(script);

            const node = callGraph.get(script);
            if (node === undefined) return;

            for (const call of node.calls)
                visitScript(call.node.script);
        }

        for (const script of ir.scripts) {
            if (script.trigger instanceof IR0TriggerProcedure)
                continue;

            visitScript(script);
        }

        const scriptsToSplice = ir.scripts.filter(script => !reachableScripts.has(script));
        
        for (const script of scriptsToSplice) {
            const scriptIndex = ir.scripts.indexOf(script);
            ir.scripts.splice(scriptIndex, 1);
        }

        return scriptsToSplice.length !== 0;
    }
}