import { IR0Pass, IRType } from "../../IRPass";
import { IR0InputConst } from "../core/IR0InputConst";
import { IR0 } from "../IR0";
import { IR0InputReference, IR0Node } from "../IR0Node";

export const IR0PassConstantFolding: IR0Pass = {
    type: IRType.IR0,

    priority: 0,

    execute: function (ir: IR0): boolean {
        let modified = false;

        ir.forEachBasicBlock(block => {
            function tryFoldInputs(node: IR0Node) {
                Object.values(node.args).forEach(tryFold);
            }

            function tryFold(inputRef: IR0InputReference) {
                const input = inputRef.input;
                
                if (input instanceof IR0InputConst) return;

                const result = input.getResult();

                if (!result.isConstant) {
                    tryFoldInputs(input);
                    return;
                }

                modified = true;
                inputRef.input = new IR0InputConst(result.constantValue, result.format);
            }

            block.forEachRootNode(tryFoldInputs, tryFold);
        });

        return modified;
    }
};