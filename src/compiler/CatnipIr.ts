import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipIrFunction, CatnipReadonlyIrFunction } from "./CatnipIrFunction";
import { CatnipIrOp, CatnipReadonlyIrOp } from "./CatnipIrOp";

export interface CatnipReadonlyIr {
    readonly compiler: CatnipCompiler;
    readonly entrypoint: CatnipReadonlyIrFunction;
    readonly functions: ReadonlyArray<CatnipReadonlyIrFunction>;

    forEachOp(lambda: (op: CatnipReadonlyIrOp) => void): void;
}

export class CatnipIr implements CatnipReadonlyIr {

    public readonly compiler: CatnipCompiler;

    public readonly entrypoint: CatnipIrFunction;
    private readonly _functions: CatnipIrFunction[];
    public get functions(): ReadonlyArray<CatnipIrFunction> { return this._functions; }

    public constructor(compiler: CatnipCompiler, funcName: string) {
        this.compiler = compiler;
        this.entrypoint = new CatnipIrFunction(this, true, funcName);
        this._functions = [this.entrypoint];
    }

    public createFunction(needsFunctionTableIndex: boolean, branch?: CatnipIrBranch): CatnipIrFunction {
        const func = new CatnipIrFunction(
            this, needsFunctionTableIndex,
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
        if (visited.has(branch)) return;
        visited.add(branch);

        let op = branch.head;

        while (op !== null) {
            lambda(op);

            for (const subbranchName in op.branches) {
                const subbranch = op.branches[subbranchName];
                if (subbranch.func !== branch.func) continue;
                this._forEachOpInBranch(lambda, subbranch, visited);
            }

            op = op.next;
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
                            return `[VARIABLE '${value.id}']`;
                        } else if (value instanceof CatnipTarget) {
                            return `[TARGET '${value.sprite.id}']`;
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
            if (func.parameters.length !== 0) string += `(${func.parameters.length} params) `;

            string += stringifyIr(func.body, "  ", new Set());
            string += "\n";
        }

        return string;
    }
}