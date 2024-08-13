import { CatnipOpInputs, CatnipInputOp, CatnipCommandOp, CatnipCommandList } from "../ops";
import { CatnipValueFormat, CatnipValueFlags } from "./types";
import { createLogger, Logger } from "../log";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipWasmEnumThreadStatus } from "../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipIrTransientVariable } from './CatnipIrTransientVariable';
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipCompilerReadonlyStack, CatnipCompilerStackElement } from "./CatnipCompilerStack";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipIrInputOp, CatnipIrOp, CatnipIrOpBranches, CatnipIrOpInputs, CatnipIrOpType } from "./CatnipIrOp";
import { ir_branch } from "./ir/core/branch";
import { ir_yield } from "./ir/core/yield";
import { ir_cast } from "./ir/core/cast";
import { ir_loop_jmp } from "./ir/core/loop_jmp";
import { ir_loop_jmp_if } from "./ir/core/loop_jmp_if";
import { ir_if_else } from "./ir/control/if_else";
import { ir_transient_create } from "./ir/core/transient_create";

export class CatnipCompilerIrGenContext {
    private static readonly _logger: Logger = createLogger("CatnipCompilerIrGenContext");
    public readonly compiler: CatnipCompiler;

    public get project() { return this.compiler.project; }

    public functions: CatnipIrFunction[];

    private _branch: CatnipIrBranch;

    public get stack(): CatnipCompilerReadonlyStack { return this._branch.stack; }

    public constructor(compiler: CatnipCompiler, func: CatnipIrFunction) {
        this.compiler = compiler;
        this.functions = [func];
        this._branch = func.body;
    }

    private _emitIr<
        TInputs extends CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches>,
        TOp extends CatnipIrOp<TInputs, TBranches, TOpType>
    >(op: TOp): TOp {
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
                tailBranch.pushOp(this._createIr(
                    ir_branch, {}, { branch: this._branch }, []
                ));
            }

            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];
                branch?.setFunction(this._branch.func);
            }
        }

        this._branch.pushOp(op);

        if (op.type.isInput) {
            this._branch.stack.push({
                ...op.type.getResult(op.inputs, op.branches, op.operands),
                source: op as CatnipIrInputOp<TInputs, TBranches>
            });
        }

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
                    this._branch.pushOp(this._createIr(
                        ir_branch, {}, { branch: newBranch }, []
                    ));
                } else {
                    for (const branchTail of yieldingBrachTails) {
                        branchTail.pushOp(this._createIr(
                            ir_branch, {}, { branch: newBranch }, []
                        ));
                    }
                }

                this._switchToBranch(newBranch);
            }
        }

        return op;
    }

    public emitIr<
        TInputs extends CatnipOpInputs,
        TBranches extends CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches>
    >(
        type: TOpType,
        inputs: TInputs,
        branches: TBranches
    ): CatnipIrOp<TInputs, TBranches, TOpType> {

        const operandCount = type.getOperandCount(inputs, branches);
        const operands = this._branch.stack.pop(operandCount);

        return this._emitIr(this._createIr(
            type,
            inputs,
            branches,
            operands
        ));
    }

    public _createIr<
        TInputs extends CatnipOpInputs,
        TBranches extends CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches>
    >(
        type: TOpType,
        inputs: TInputs,
        branches: TBranches,
        operands: CatnipCompilerStackElement[]
    ): CatnipIrOp<TInputs, TBranches, TOpType> {
        return {
            type,
            inputs,
            branches,
            operands,
            next: null,
            prev: null
        };
    }

    public emitYield(status: CatnipWasmEnumThreadStatus = CatnipWasmEnumThreadStatus.YIELD, branch?: CatnipIrBranch) {
        if (branch === undefined) {
            branch = this._createFunction(true).body;
        } else {
            this._createBranchFunction(branch, true);
        }
        this.emitIr(ir_yield, { status }, { branch });
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

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>): void;
    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipValueFormat, flags: CatnipValueFlags): void;

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format?: CatnipValueFormat, flags?: CatnipValueFlags) {
        op.type.generateIr(this, op.inputs);
        if (format !== undefined)
            this.emitCast(format, flags ?? CatnipValueFlags.ANY);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitCommands(commands: CatnipCommandList) {
        for (const command of commands) {
            this.emitCommand(command);
        }
    }

    public emitCast(format: CatnipValueFormat, flags: CatnipValueFlags) {
        const operand = this.stack.peek();

        if (operand.format !== format) {
            if (!operand.source.type.tryCast(operand.source, format, flags)) {
                this.emitIr(ir_cast, { format, flags }, {});
            }
        }
    }

    public emitJump(branch: CatnipIrBranch, continues: boolean = true) {
        if (this._branch.funcNullable === branch.funcNullable) {
            branch.isLoop = true;
            this.emitIr(ir_loop_jmp, { continues }, { branch })
        } else {
            this._createBranchFunction(branch, true);
            this.emitIr(ir_yield, { status: CatnipWasmEnumThreadStatus.RUNNING, continue: false }, { branch });
        }
    }

    public emitConditionalJump(branch: CatnipIrBranch, continues: boolean = true) {
        if (this._branch.funcNullable === branch.funcNullable) {
            branch.isLoop = true;
            this.emitIr(ir_loop_jmp_if, { continues }, { branch })
        } else {
            this.emitIr(ir_if_else, {}, {
                true_branch: this.emitBranch(() => {
                    this._createBranchFunction(branch, true);
                    this.emitIr(ir_yield, { status: CatnipWasmEnumThreadStatus.RUNNING, continue: false }, { branch });
                }),
                false_branch: null,
            });
        }
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

    public emitTransientCreate(format: CatnipValueFormat, name?: string): CatnipIrTransientVariable {
        const variable = new CatnipIrTransientVariable(format, name);
        this.emitIr(ir_transient_create, { variable }, {});
        return variable;
    }

    private _getFuncName(func: CatnipIrFunction) {
        return "Func" + this.functions.indexOf(func);
    }

    public stringifyIr(): string {
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
                        if (subbranch === null) {
                            string += ": null\n";
                        } else if (subbranch.func === branch.func && !subbranch.isFuncBody) {
                            if (branches.has(subbranch)) {
                                string += ": ??\n";
                            } else {
                                string += ": ";
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

                op = op.next;
            }

            return string;
        }

        for (const func of this.functions) {
            string += this._getFuncName(func);
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
