import { CatnipProcedureID } from "../runtime/CatnipScript";
import { CatnipSpriteID } from "../runtime/CatnipSprite";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompiler, CatnipCompilerProcedureInfo } from "./CatnipCompiler";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipIrExternalValueSourceType, CatnipIrFunction, CatnipIrExternalLocationType, CatnipReadonlyIrFunction } from "./CatnipIrFunction";
import { CatnipIrOp, CatnipReadonlyIrOp } from "./CatnipIrOp";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";

export interface CatnipReadonlyIr {
    readonly compiler: CatnipCompiler;
    readonly entrypoint: CatnipReadonlyIrFunction;
    readonly functions: ReadonlyArray<CatnipReadonlyIrFunction>;
    readonly procedureInfo: Readonly<CatnipCompilerProcedureInfo> | null;
    readonly procedureArguments: ReadonlyArray<CatnipIrTransientVariable>

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

    public readonly procedureInfo: Readonly<CatnipCompilerProcedureInfo> | null;
    public readonly procedureArguments: ReadonlyArray<CatnipIrTransientVariable>;

    public constructor(compiler: CatnipCompiler, funcName: string, spriteID: CatnipSpriteID, procedureInfo: CatnipCompilerProcedureInfo | null) {
        this.compiler = compiler;
        this.entrypoint = new CatnipIrFunction(this, funcName);
        this._functions = [this.entrypoint];
        this._transientVariableNames = new Set();
        this.spriteID = spriteID;

        this.procedureInfo = procedureInfo;

        if (procedureInfo === null) {
            this.procedureArguments = [];
        } else {
            procedureInfo.ir = this;
            let procedureArguments: CatnipIrTransientVariable[] = [];

            for (const argInfo of procedureInfo.args) {
                procedureArguments.push(new CatnipIrTransientVariable(this, argInfo.format, argInfo.name));
            }

            this.procedureArguments = procedureArguments;
        }
    }

    public createFunction(branch?: CatnipIrBranch): CatnipIrFunction {
        const func = new CatnipIrFunction(
            this,
            `${this.entrypoint.name}_func${this._functions.length}`,
            branch
        );
        this._functions.push(func);
        return func;
    }

    public forEachOp(lambda: (op: CatnipIrOp) => void) {
        const visited: Set<CatnipIrBranch> = new Set();
        for (const func of this._functions) {
            this._forEachOpInBranch(lambda, func.body, visited);
        }
    }

    private _forEachOpInBranch(lambda: (op: CatnipIrOp) => void, branch: CatnipIrBranch, visited: Set<CatnipIrBranch>) {
        if (branch.func.ir !== this) return;
        if (visited.has(branch)) return;
        visited.add(branch);

        let op = branch.head;

        while (op !== null) {
            lambda(op);

            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];
                this._forEachOpInBranch(lambda, subbranch, visited);
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

        const stringifyIr = (branch: CatnipIrBranch, indent: string, branches: Set<CatnipIrBranch>) => {
            branches.add(branch);
            let string = "";

            if (branch.isLoop) {
                string += "(loop) "
            }
            string += "\n";

            let op = branch.head;
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
                        if (subbranch.func === branch.func && !subbranch.isFuncBody) {
                            if (branches.has(subbranch)) {
                                string += ": ??\n";
                            } else {
                                string += ": ";
                                string += stringifyIr(subbranch, indent + "    ", branches);
                            }
                        } else {
                            string += " -> ";
                            if (!subbranch.isFuncBody) string += "[INVALID] ";
                            string += subbranch.func.name;
                            if (subbranch.func.ir !== this) {
                                string += " [IR '";
                                string += subbranch.func.ir.entrypoint.name;
                                string += "']"
                            }
                            string += "\n";
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