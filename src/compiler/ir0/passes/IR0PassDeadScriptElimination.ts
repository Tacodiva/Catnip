import { IR0Pass, IRType } from "../../IRPass";
import { IR0 } from "../IR0";
import { IR0Script } from "../IR0Script";
import { IR0TriggerProcedure } from "../procedure/IR0TriggerProcedure";

// TODO This currently will not get rid of mutually recursive scripts

export const IR0PassDeadScriptElimination: IR0Pass = {
    type: IRType.IR0,
    priority: 0,

    execute: function (ir: IR0): boolean {

        const callGraph = ir.createCallGraph();

        const scriptsToSplice: IR0Script[] = [];

        for (const script of ir.scripts) {

            if (!(script.trigger instanceof IR0TriggerProcedure))
                continue;

            const scriptGraphNode = callGraph.get(script);

            if (scriptGraphNode === undefined || scriptGraphNode.callers.length === 0) {
                // The procedure is not called, let's get rid of it
                scriptsToSplice.push(script);
            }
        }

        for (const script of scriptsToSplice) {
            const scriptIndex = ir.scripts.indexOf(script);
            ir.scripts.splice(scriptIndex, 1);
        }

        return scriptsToSplice.length !== 0;
    }
}