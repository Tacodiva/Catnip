import { CatnipOpInputs, CatnipInputOp, CatnipCommandOp, CatnipCommandList } from "../ir";
import { CatnipIrOpBranches, CatnipIrCommandOpType, CatnipIrCommandOp, CatnipIrInputOpType, CatnipIrInputOp, CatnipIrOpInputs, CatnipIrOpBase } from "../ir/CatnipIrOp";
import { CatnipIrBranch } from "../ir/CatnipIrBranch";
import { ir_branch } from "../ir/ops/core/branch";
import { ir_yield } from "../ir/ops/core/yield";
import { CatnipInputFormat, CatnipInputFlags } from "../ir/types";
import { createLogger, Logger } from "../log";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipWasmEnumThreadStatus } from "../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipIrValue } from './CatnipIrValue';
import { SpiderNumberType } from "wasm-spider";
import { ir_const } from "../ir/ops/core/const";
import { ir_store_value } from '../ir/ops/core/store_value';
import { ir_load_value } from '../ir/ops/core/load_value';

/*

Compiler Stages:

Stage 1: Generate
    -> All the operations are converted to their IR counterpart
    -> The IR is split up into functions and linked together

Stage 2: Analyse
    -> Inlining!
    -> Constant folding / Dead branch removal
    -> Type analysis + Simplification

Stage 3: Emit
    -> Each section is converted into WASM

*/

export class CatnipCompilerIrGenContext {
    private static readonly _logger: Logger = createLogger("CatnipCompilerIrGenContext");
    public readonly compiler: CatnipCompiler;

    public functions: CatnipIrFunction[];

    private _branch: CatnipIrBranch;

    public constructor(compiler: CatnipCompiler, func: CatnipIrFunction) {
        this.compiler = compiler;
        this.functions = [func];
        this._branch = func.body;
    }

    private _emitIr<TOp extends CatnipIrOpBase<CatnipIrOpInputs, TBranches>, TBranches extends CatnipIrOpBranches>(
        op: TOp
    ): TOp {
        if (!this._branch.doesContinue()) return op;

        const opBranchNames = Object.keys(op.branches);

        if (this._branch.funcNullable !== null) {
            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];
                if (branch !== null && branch.funcNullable === null)
                    branch.setFunction(this._branch.func);
            }
        }

        const branchTails = this._branch.getTails();

        let splitAfter = false;
        for (const branchName of opBranchNames) {
            const branch = op.branches[branchName];

            if (branch !== null && op.type.doesBranchContinue(branchName, op) && branch.isYielding()) {
                splitAfter = true;
                break;
            }
        }

        let mergeBefore = false;
        for (const tailBranch of branchTails) {
            if (tailBranch.funcNullable !== this._branch.funcNullable) {
                mergeBefore = true;
                break;
            }
        }

        if (mergeBefore) {
            this._switchToBranch(this._createFunction(false).body);

            for (const tailBranch of branchTails) {
                tailBranch.ops.push({
                    type: ir_branch,
                    inputs: {},
                    branches: { branch: this._branch },
                });
            }

            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];
                branch?.setFunction(this._branch.func);
            }
        }

        this._branch.ops.push(op);

        if (splitAfter) {

            let hasNonYieldingBranch = false;
            let yieldingBrachTails: Set<CatnipIrBranch> = new Set();

            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];

                if (op.type.doesBranchContinue(branchName, op)) {
                    if (branch?.isYielding()) {
                        for (const tail of branch.getTails())
                            yieldingBrachTails.add(tail);
                    } else {
                        hasNonYieldingBranch = true;
                    }
                }
            }

            // We don't need to create a new function if there is only one place we continue
            if (!hasNonYieldingBranch && yieldingBrachTails.size === 1) {
                for (const branchTail of yieldingBrachTails) {
                    this._switchToBranch(branchTail);
                    break;
                }
            } else {
                const newBranch = this._createFunction(false).body;

                if (hasNonYieldingBranch) {
                    this._branch.ops.push({
                        type: ir_branch,
                        inputs: {},
                        branches: { branch: newBranch },
                    });
                } else {
                    for (const branchTail of yieldingBrachTails) {
                        branchTail.ops.push({
                            type: ir_branch,
                            inputs: {},
                            branches: { branch: newBranch },
                        });
                    }
                }

                this._switchToBranch(newBranch);
            }
        }

        return op;
    }

    public emitIrCommand<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(
        op: CatnipIrCommandOpType<TInputs, TBranches>,
        inputs: TInputs,
        branches: TBranches
    ): CatnipIrCommandOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrCommandOp<TInputs, TBranches>, TBranches>({
            type: op,
            inputs,
            branches
        });
    }

    public emitIrInput<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(
        op: CatnipIrInputOpType<TInputs, TBranches>,
        inputs: TInputs,
        format: CatnipInputFormat,
        flags: CatnipInputFlags,
        branches: TBranches,
    ): CatnipIrInputOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrInputOp<TInputs, TBranches>, TBranches>({
            type: op,
            inputs,
            format,
            flags,
            branches
        });
    }

    public emitYield(status: CatnipWasmEnumThreadStatus = CatnipWasmEnumThreadStatus.YIELD, branch?: CatnipIrBranch) {
        if (branch === undefined) {
            branch = this._createFunction(true).body;

        } else {
            this._createBranchFunction(branch, true);
        }
        this.emitIrCommand(ir_yield, { status }, { branch });
        this._switchToBranch(branch);
    }

    private _createFunction(needsFunctionTableIndex: boolean): CatnipIrFunction {
        const func = new CatnipIrFunction(this.compiler, needsFunctionTableIndex);
        this.functions.push(func);
        return func;
    }

    private _switchToBranch(branch: CatnipIrBranch) {
        this._branch = branch;
    }

    private _createBranchFunction(branch: CatnipIrBranch, needsFunctionTableIndex: boolean): CatnipIrFunction {
        if (branch.isFuncBody) {
            branch.func.needsFunctionTableIndex ||= needsFunctionTableIndex;
            return branch.func;
        }

        const func = new CatnipIrFunction(this.compiler, needsFunctionTableIndex, branch);
        this.functions.push(func);
        return func;
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipInputFormat, flags: CatnipInputFlags) {
        op.type.generateIr(this, op.inputs, format, flags);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitCommands(commands: CatnipCommandList) {
        for (const command of commands) {
            this.emitCommand(command);
        }
    }

    public emitJump(branch: CatnipIrBranch) {
        this._createBranchFunction(branch, true);
        this.emitIrCommand(ir_yield, { status: CatnipWasmEnumThreadStatus.RUNNING, continue: false }, { branch });
    }

    /** Creates a new, empty branch */
    public emitBranch(): CatnipIrBranch;
    /** Creates a new branch and emits all the commands in the command list to it. */
    public emitBranch(commands: CatnipCommandList): CatnipIrBranch;
    /** Creates a new branch, switches this context to emit to that branch, calls lambda then switches back to the previous context.  */
    public emitBranch(lambda: (branch: CatnipIrBranch) => void): CatnipIrBranch;

    public emitBranch(arg?: CatnipCommandList | ((branch: CatnipIrBranch) => void)): CatnipIrBranch {

        let branch = new CatnipIrBranch();
        if (arg !== undefined) {
            const oldBranch = this._branch;
            this._branch = branch;

            if (Array.isArray(arg)) {
                this.emitCommands(arg);
            } else {
                arg(branch);
            }

            this._branch = oldBranch;
        }


        return branch;
    }

    public emitStoreNewValue(type: SpiderNumberType, name?: string): CatnipIrValue {
        const value = new CatnipIrValue(type, name);
        this.emitIrCommand(ir_store_value, { value, initialize: true }, {});
        return value;
    }

    public emitStoreValue(value: CatnipIrValue) {
        this.emitIrCommand(ir_store_value, { value, initialize: false }, {});
    }

    public emitLoadValue(value: CatnipIrValue) {
        this.emitIrCommand(ir_load_value, { value }, {});
    }

    private _getFuncName(func: CatnipIrFunction) {
        return "Func" + this.functions.indexOf(func);
    }

    public stringifyIr(): string {
        let string = "";


        const stringifyIr = (branch: CatnipIrBranch, indent: string, branches: Set<CatnipIrBranch>) => {

            let string = "";

            for (const op of branch.ops) {
                string += indent;
                string += op.type.name;
                if (Object.keys(op.inputs).length !== 0) {
                    string += " ";
                    string += JSON.stringify(op.inputs);
                }
                if (Object.keys(op.branches).length !== 0) {
                    for (const subbranchName in op.branches) {
                        const subbranch = op.branches[subbranchName];
                        string += "\n  ";
                        string += indent;
                        string += subbranchName;
                        if (subbranch === null) {
                            string += ": null\n";
                        } else if (subbranch.func === branch.func && !subbranch.isFuncBody) {
                            if (branches.has(subbranch)) {
                                string += ": ??\n";
                            } else {
                                branches.add(subbranch);
                                string += ": \n";
                                string += stringifyIr(subbranch, indent + "    ", branches);
                            }
                        } else {
                            string += " -> ";
                            if (!subbranch.isFuncBody) string += "[INVALID] ";
                            string += this._getFuncName(subbranch.func);
                            string += "\n";
                        }
                    }
                } else {
                    string += "\n";
                }
            }

            return string;
        }

        for (const func of this.functions) {
            string += this._getFuncName(func);
            string += ":";
            if (func.body.isYielding()) string += " (yielding)";
            if (func.stackSize !== 0) string += ` (${func.stackSize} byte stack)`;
            string += "\n";

            // string += ": \n";
            string += stringifyIr(func.body, "  ", new Set());
            string += "\n";
        }

        return string;
    }

}
