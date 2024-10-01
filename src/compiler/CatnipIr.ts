
/**
 * The Plan:
 * 
 *  - Each IR tracks a list of its script dependencies
 *  - We figure out script dependencies by inspecting the ops
 *  - No compilation is done when we add the script to the compiler
 *      -> Only the IR is created and dependencies are found (but not resolved)
 *      -> 
 *  - Th
 * 
 */

import { CatnipScript } from "../runtime/CatnipScript";
import { CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipIrBranchType } from "./CatnipIrBranch";
import { CatnipIrExternalValueSourceType, CatnipIrFunction, CatnipIrExternalLocationType, CatnipReadonlyIrFunction } from "./CatnipIrFunction";
import { CatnipIrOp, CatnipReadonlyIrOp } from "./CatnipIrOp";
import { CatnipIrScriptTrigger } from "./CatnipIrScriptTrigger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";

export interface CatnipReadonlyIr {
    readonly compiler: CatnipCompiler;
    readonly entrypoint: CatnipReadonlyIrFunction;
    readonly functions: ReadonlyArray<CatnipReadonlyIrFunction>;
    readonly trigger: CatnipIrScriptTrigger;

    forEachOp(lambda: (op: CatnipReadonlyIrOp) => void): void;
    getUniqueTransientVariableName(name: string): string;
}

export class CatnipIr implements CatnipReadonlyIr {

    public readonly compiler: CatnipCompiler;
    public readonly spriteID: CatnipSpriteID;

    public readonly entrypoint: CatnipIrFunction;
    private readonly _functions: CatnipIrFunction[];
    public get functions(): ReadonlyArray<CatnipIrFunction> { return this._functions; }

    private _transientVariableNames: Set<string>;

    public readonly trigger: CatnipIrScriptTrigger;

    public constructor(compiler: CatnipCompiler, script: CatnipScript) {
        this.compiler = compiler;
        this.entrypoint = new CatnipIrFunction(this, "idk_man");
        this._functions = [this.entrypoint];
        this._transientVariableNames = new Set();
        this.spriteID = script.sprite.id;

        this.trigger = script.trigger.type.createTriggerIR(this, script.trigger.inputs);
    }

    public createFunction(body?: CatnipIrBasicBlock): CatnipIrFunction {
        const func = new CatnipIrFunction(
            this,
            `${this.entrypoint.name}_func${this._functions.length}`,
            body
        );
        this._functions.push(func);
        return func;
    }

    public forEachOp(lambda: (op: CatnipIrOp) => void) {
        const visited: Set<CatnipIrBasicBlock> = new Set();
        for (const func of this._functions) {
            this._forEachOpInBlock(lambda, func.body, visited);
        }
    }

    private _forEachOpInBlock(lambda: (op: CatnipIrOp) => void, block: CatnipIrBasicBlock, visited: Set<CatnipIrBasicBlock>) {
        if (visited.has(block)) return;
        visited.add(block);

        let op = block.head;

        while (op !== null) {
            lambda(op);

            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];
                if (subbranch.branchType === CatnipIrBranchType.INTERNAL)
                    this._forEachOpInBlock(lambda, subbranch.body, visited);
            }

            op = op.next;
        }
    }

    public getUniqueTransientVariableName(name: string): string {
        if (!this._transientVariableNames.has(name)) {
            this._transientVariableNames.add(name);
            return name;
        }

        let i = 2;
        while (true) {
            const possibleName = name + " #" + i;
            if (!this._transientVariableNames.has(possibleName)) {
                this._transientVariableNames.add(possibleName);
                return possibleName;
            }
        }
    }

    public toString(): string {
        let string = "";

        const stringifyIr = (block: CatnipIrBasicBlock, indent: string, visited: Set<CatnipIrBasicBlock>) => {
            visited.add(block);
            let string = "";

            if (block.isLoop) {
                string += "(loop) "
            }
            string += "\n";

            let op = block.head;
            while (op !== null) {
                string += indent;
                string += op.type.name;
                if (Object.keys(op.inputs).length !== 0) {
                    string += " ";
                    string += JSON.stringify(op.inputs, (key: string, value: any) => {
                        if (value instanceof CatnipVariable) {
                            return `<VARIABLE '${value.id}'>`;
                        } else if (value instanceof CatnipTarget) {
                            return `<TARGET '${value.sprite.id}'>`;
                        } else if (value instanceof CatnipIrTransientVariable) {
                            return `<TRANSIENT '${value.name}'>`;
                        }
                        return value;
                    });
                }
                if (Object.keys(op.branches).length !== 0) {
                    for (const subbranchName in op.branches) {
                        const subbranch = op.branches[subbranchName];
                        string += "\n  ";
                        string += indent;
                        string += subbranchName;

                        if (!subbranch.resolved) {
                            string += ": [UNRESOLVED]";
                        } else {
                            if (subbranch.body.func === block.func && !subbranch.body.isFuncBody) {
                                if (visited.has(subbranch.body)) {
                                    string += ": ??\n";
                                } else {
                                    string += ": ";
                                    string += stringifyIr(subbranch.body, indent + "    ", visited);
                                }
                            } else {
                                string += " -> ";
                                if (!subbranch.body.isFuncBody) string += "[INVALID] ";
                                string += subbranch.body.func.name;
                                if (subbranch.body.func.ir !== this) {
                                    string += " [IR '";
                                    string += subbranch.body.func.ir.entrypoint.name;
                                    string += "']"
                                }
                                string += "\n";
                            }
                        }
                    }
                } else {
                    string += "\n";
                }

                op = op.next;
            }

            return string;
        }

        for (const func of this.functions) {
            string += func.name;
            string += ": ";
            if (func.body.isYielding()) string += "(yielding) ";
            if (func.stackSize !== 0) string += `(${func.stackSize} byte stack) `;
            if (func.hasFunctionTableIndex) string += `(fntbl ${func.functionTableIndex}) `;

            let hasTransients = false;
            for (const variableInfo of func.transientVariables) {
                hasTransients = true;
                string += "\n  <'";
                string += variableInfo.variable.name;
                string += "'";
                if (variableInfo.source !== null) {
                    string += " ";
                    switch (variableInfo.source.location.type) {
                        case CatnipIrExternalLocationType.PARAMETER:
                            string += "PARAMETER ";
                            break;
                        case CatnipIrExternalLocationType.STACK:
                            string += "STACK ";
                            break;
                    }
                    switch (variableInfo.source.value.type) {
                        case CatnipIrExternalValueSourceType.TRANSIENT_VARIABLE:
                            string += "TRANSIENT";
                            if (variableInfo.source.value.variable !== variableInfo.variable) {
                                string += " '";
                                string += variableInfo.source.value.variable.name;
                                string += "'";
                            }
                            break;
                        case CatnipIrExternalValueSourceType.PROCEDURE_INPUT:
                            string += "PROCEDURE_INPUT";
                            break;
                    }
                }
                string += ">";
            }
            if (hasTransients) string += "\n";

            string += stringifyIr(func.body, "  ", new Set());
            string += "\n";
        }

        return string;
    }
}