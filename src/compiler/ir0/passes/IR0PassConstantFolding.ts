import { IR0Pass, IRType } from "../../IRPass";
import { IR0InputConst } from "../core/IR0InputConst";
import { IR0 } from "../IR0";
import { IR0Input, IR0Node } from "../IR0Node";

export const IR0PassConstantFolding: IR0Pass = {
    type: IRType.IR0,

    priority: 0,

    execute: function (ir: IR0): boolean {
        let modified = false;

        ir.forEachBasicBlock(block => {
            function tryFoldInputs(node: IR0Node): void {
                for (const argName in node.args) {
                    const arg = node.args[argName];
                    arg.value = tryFold(arg.value);
                }
            }

            function tryFold(input: IR0Input): IR0Input {
                tryFoldInputs(input);

                if (input instanceof IR0InputConst)
                    return input;

                const result = input.getResult();

                if (!result.isConstant)
                    return input;

                modified = true;
                return new IR0InputConst(result.constantValue, result.format);
            }

            block.forEachRootNode(tryFoldInputs, tryFold);
        });

        return modified;
    }
};