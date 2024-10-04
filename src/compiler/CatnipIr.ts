
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

import { CatnipCommandList } from "../ops";
import { CatnipScript, CatnipScriptID } from "../runtime/CatnipScript";
import { CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompiler, CatnipIrPreAnalysis } from "./CatnipCompiler";
import { CatnipCompilerIrGenContext } from "./CatnipCompilerIrGenContext";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipCompilerWasmGenContext } from "./CatnipCompilerWasmGenContext";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipIrBranchType, CatnipIrExternalBranch } from "./CatnipIrBranch";
import { CatnipIrExternalValueSourceType, CatnipIrFunction, CatnipIrExternalLocationType, CatnipReadonlyIrFunction } from "./CatnipIrFunction";
import { CatnipIrOp, CatnipReadonlyIrOp } from "./CatnipIrOp";
import { CatnipIrScriptTrigger } from "./CatnipIrScriptTrigger";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { ir_barrier } from "./ir/core/barrier";
import { ir_thread_terminate } from "./ir/core/thread_terminate";

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
    public readonly scriptID: CatnipScriptID;
    public readonly commands: CatnipCommandList;

    private _entrypoint: CatnipIrFunction | null;

    public get hasCommandIR(): boolean {
        return this._entrypoint !== null;
    }

    public get entrypoint(): CatnipIrFunction {
        if (this._entrypoint === null)
            throw new Error("No IR generated for script.");
        return this._entrypoint;
    }

    private readonly _functions: CatnipIrFunction[];
    public get functions(): ReadonlyArray<CatnipIrFunction> { return this._functions; }

    private _transientVariableNames: Set<string>;

    public readonly trigger: CatnipIrScriptTrigger;

    private _returnLocationVariable: CatnipIrTransientVariable | null;
    public get returnLocationVariable(): CatnipIrTransientVariable {
        if (this._returnLocationVariable === null)
            throw new Error("Function does not have a return location");
        return this._returnLocationVariable;
    }

    private _preAnalysis: Readonly<CatnipIrPreAnalysis> | null;
    public get preAnalysis(): Readonly<CatnipIrPreAnalysis> {
        if (this._preAnalysis === null)
            throw new Error("IR does not have a pre analysis.");
        return this._preAnalysis;
    }
    
    public constructor(compiler: CatnipCompiler, script: CatnipScript) {
        this.compiler = compiler;
        this._entrypoint = null;
        this._functions = [];
        this.spriteID = script.sprite.id;
        this.scriptID = script.id;
        this.commands = script.commands;

        this._transientVariableNames = new Set();

        this.trigger = script.trigger.type.createTriggerIR(this, script.trigger.inputs);

        if (this.trigger.type.requiresReturnLocation(this, this.trigger.inputs)) {
            this._returnLocationVariable = new CatnipIrTransientVariable(this, CatnipValueFormat.I32, "Return Location");
        } else {
            this._returnLocationVariable = null;
        }

        this._preAnalysis = null;
    }

    public createCommandIR() {
        if (this._entrypoint !== null) {
            CatnipCompilerLogger.warn("IR created twice.");
            return;
        }

        this._entrypoint = new CatnipIrFunction(this, "script_" + this.scriptID);
        this._functions.push(this._entrypoint);

        const ctx = new CatnipCompilerIrGenContext(this);

        this.trigger.type.preIR(ctx, this.trigger.inputs);
        ctx.emitCommands(this.commands);
        this.trigger.type.postIR(ctx, this.trigger.inputs);
        ctx.finish();
    }

    public createWASM() {
        for (const func of this.functions) {
            const wasmGenCtx = new CatnipCompilerWasmGenContext(func);
            wasmGenCtx.emitOps(func.body);
            wasmGenCtx.finish();
        }
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

    public setPreAnalysis(preAnalysis: CatnipIrPreAnalysis) {
        if (this._preAnalysis !== null)
            CatnipCompilerLogger.warn("IR already has a pre analysis.");
        this._preAnalysis = preAnalysis;
    }

    public toString(): string {
        let string = "IR '" + this.scriptID + "'";

        if (this._preAnalysis?.isYielding)
            string += " (yielding)";

        string += "\n\n";

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
                    string += op.type.stringifyInputs(op.inputs);
                }
                if (Object.keys(op.branches).length !== 0) {
                    for (const subbranchName in op.branches) {
                        const subbranch = op.branches[subbranchName];
                        string += "\n  ";
                        string += indent;
                        
                        if (subbranch.branchType === CatnipIrBranchType.INTERNAL && subbranch.isLoop)
                            string += "(loop) ";

                        string += subbranchName;

                        if (!subbranch.bodyResolved) {
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
                                if (subbranch.branchType === CatnipIrBranchType.EXTERNAL) {
                                    string += " [RETURN ";
                                    string += subbranch.returnLocation ? (`'${subbranch.returnLocation.body.func.name}' (fntbl ${subbranch.returnLocation.body.func.hasFunctionTableIndex ? subbranch.returnLocation.body.func.functionTableIndex : "[NONE!]"})`) : "null";
                                    string += "]"

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
            if (func.body.func !== func) string += `(BODY FUNC MISMATCH!!) `

            let hasTransients = false;
            for (const variableInfo of func.transientVariables) { 
                hasTransients = true;
                string += "\n  <'";
                string += variableInfo.variable.name;
                string += "'";
                if (variableInfo.source === null) {
                    string += " DECLARED";
                } else {
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
                        case CatnipIrExternalValueSourceType.RETURN_LOCATION:
                            string += "RETURN_LOCATION";
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