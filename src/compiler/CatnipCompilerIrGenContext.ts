import { CatnipOpInputs, CatnipInputOp, CatnipCommandOp, CatnipCommandList } from "../ops";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { createLogger, Logger } from "../log";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipWasmEnumThreadStatus } from "../wasm-interop/CatnipWasmEnumThreadStatus";
import { CatnipIrTransientVariable } from './CatnipIrTransientVariable';
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipCompilerReadonlyStack, CatnipCompilerStackElement } from "./CatnipCompilerStack";
import { CatnipIrBranch, CatnipIrBranchType } from "./CatnipIrBranch";
import { CatnipIrInputOp, CatnipIrOp, CatnipIrOpBranches, CatnipIrOpBranchesDefinition, CatnipIrOpInputs, CatnipIrOpType } from "./CatnipIrOp";
import { ir_branch } from "./ir/core/branch";
import { ir_yield } from "./ir/core/yield";
import { ir_cast } from "./ir/core/cast";
import { ir_loop_jmp } from "./ir/core/loop_jmp";
import { ir_if_else } from "./ir/control/if_else";
import { ir_transient_create } from "./ir/core/transient_create";
import { CatnipIr } from "./CatnipIr";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";

export class CatnipCompilerIrGenContext {
    private static readonly _logger: Logger = createLogger("CatnipCompilerIrGenContext");

    public readonly ir: CatnipIr;
    public get compiler() { return this.ir.compiler; }
    public get project() { return this.compiler.project; }

    private _body: CatnipIrBasicBlock;

    public get stack(): CatnipCompilerReadonlyStack { return this._body.stack; }

    public constructor(ir: CatnipIr) {
        this.ir = ir;
        this._body = ir.entrypoint.body;
    }

    private _emitIr<
        TInputs extends CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches>,
        TOp extends CatnipIrOp<TInputs, TBranches, TOpType>
    >(op: TOp): TOp {
        if (!this._body.doesContinue()) return op;

        const opBranchNames = Object.keys(op.branches);

        if (this._body.funcNullable !== null) {
            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];
                if (branch.branchType === CatnipIrBranchType.INTERNAL && branch.body.funcNullable === null)
                    branch.body.setFunction(this._body.func);
            }
        }

        const branchTails = this._body.getTails();

        let joinAfter = false;
        for (const branchName of opBranchNames) {
            const branch = op.branches[branchName];

            if (branch.branchType === CatnipIrBranchType.INTERNAL && branch.body.isYielding()) {
                joinAfter = true;
                break;
            }
        }

        let mergeBefore = false;
        for (const tailBranch of branchTails) {
            if (tailBranch.funcNullable !== this._body.funcNullable) {
                mergeBefore = true;
                break;
            }
        }

        if (mergeBefore) {
            this._switchToBlock(this.ir.createFunction().body);

            for (const tailBranch of branchTails) {
                tailBranch.pushOp(this._createIr(
                    ir_yield,
                    { status: CatnipWasmEnumThreadStatus.RUNNING },
                    { branch: { body: this._body, branchType: CatnipIrBranchType.INTERNAL, resolved: true } }, [], tailBranch
                ));
            }

            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];
                if (branch.branchType === CatnipIrBranchType.INTERNAL)
                    branch.body.setFunction(this._body.func);
            }
        }

        op.block = this._body;
        this._body.pushOp(op);

        if (op.type.isInput) {
            this._body.stack.push({
                ...op.type.getResult(op.inputs, op.branches, op.operands),
                source: op as CatnipIrInputOp<TInputs, CatnipIrOpBranches<TBranches>>
            });
        }

        if (joinAfter) {

            let nonYieldingBraches: Set<CatnipIrBasicBlock> = new Set();
            let yieldingBrachTails: Set<CatnipIrBasicBlock> = new Set();

            for (const branchName of opBranchNames) {
                const branch = op.branches[branchName];

                if (branch.branchType === CatnipIrBranchType.INTERNAL) {
                    if (branch.body.isYielding()) {
                        for (const tail of branch.body.getTails())
                            yieldingBrachTails.add(tail);
                    } else {
                        nonYieldingBraches.add(branch.body);
                    }
                }
            }

            // All the branches in "yieldingBrachTails" will be made to yield to
            //  the next operations emitted, so they will be made into yielding branches
            //  thus we do not consider them as "non yielding branches". 
            for (const yieldingBranchTail of yieldingBrachTails)
                nonYieldingBraches.delete(yieldingBranchTail);

            // We don't need to create a new function if there is only one place we continue
            if (nonYieldingBraches.size === 0 && yieldingBrachTails.size === 1) {
                for (const branchTail of yieldingBrachTails) {
                    this._switchToBlock(branchTail);
                    break;
                }
            } else {
                if (nonYieldingBraches.size !== 0 || yieldingBrachTails.size !== 0) {
                    const newFuncBody = this.ir.createFunction().body;

                    for (const branchTail of yieldingBrachTails) {
                        branchTail.pushOp(this._createIr(
                            ir_yield,
                            { status: CatnipWasmEnumThreadStatus.RUNNING },
                            { branch: { body: newFuncBody, branchType: CatnipIrBranchType.INTERNAL, resolved: true } }, [], branchTail
                        ));
                    }

                    if (nonYieldingBraches.size !== 0 && op.type.doesContinue(op)) {
                        this._body.pushOp(this._createIr(
                            ir_yield,
                            { status: CatnipWasmEnumThreadStatus.RUNNING },
                            { branch: { body: newFuncBody, branchType: CatnipIrBranchType.INTERNAL, resolved: true } }, []
                        ));
                    }

                    this._switchToBlock(newFuncBody);
                }
            }
        }

        return op;
    }

    public emitIr<
        TOpType extends CatnipIrOpType<TInputs, TBranches>,
        TInputs extends CatnipOpInputs = TOpType extends CatnipIrOpType<infer I, CatnipIrOpBranchesDefinition> ? I : never,
        TBranches extends CatnipIrOpBranches = TOpType extends CatnipIrOpType<CatnipIrOpInputs, infer I> ? CatnipIrOpBranches<I> : never,
    >(
        type: TOpType,
        inputs: TInputs,
        branches: CatnipIrOpBranches<TBranches>
    ) {
        if (!this._body.doesContinue()) return null;

        const operandCount = type.getOperandCount(inputs, branches);
        const operands = this._body.stack.pop(operandCount);

        this._emitIr(this._createIr(
            type,
            inputs,
            branches,
            operands
        ));
    }

    public _createIr<
        TInputs extends CatnipOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches>
    >(
        type: TOpType,
        inputs: TInputs,
        branches: CatnipIrOpBranches<TBranches>,
        operands: CatnipCompilerStackElement[],
        branch?: CatnipIrBasicBlock
    ): CatnipIrOp<TInputs, TBranches, TOpType> {
        return {
            type,
            inputs,
            branches,
            operands,
            next: null,
            prev: null,
            block: branch ?? this._body,
            removed: false
        };
    }

    public emitYield(status: CatnipWasmEnumThreadStatus = CatnipWasmEnumThreadStatus.YIELD, block?: CatnipIrBasicBlock) {
        if (block === undefined) {
            block = this.ir.createFunction().body;
        } else {
            this._createBlockFunction(block);
        }
        this.emitIr(ir_yield, { status }, { branch: this.emitBranch(block) });
        this._switchToBlock(block);
    }

    private _switchToBlock(block: CatnipIrBasicBlock) {
        this._body = block;
    }

    private _createBlockFunction(block: CatnipIrBasicBlock): CatnipIrFunction {
        if (block.isFuncBody) {
            return block.func;
        }

        return this.ir.createFunction(block);
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>): void;
    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipValueFormat): void;

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format?: CatnipValueFormat) {
        op.type.generateIr(this, op.inputs);
        if (format !== undefined)
            this.emitCast(format);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitCommands(commands: CatnipCommandList) {
        for (const command of commands) {
            this.emitCommand(command);
        }
    }

    public emitCast(format: CatnipValueFormat) {
        if (!this._body.doesContinue()) return;
        const operand = this.stack.peek();

        if (operand.format !== format) {
            if (!operand.source.type.tryCast(operand.source, format)) {
                this.emitIr(ir_cast, { format }, {});
            }
        }
    }

    public emitJump(block: CatnipIrBasicBlock) {
        if (this._body.funcNullable === block.funcNullable) {
            block.isLoop = true;
            this.emitIr(ir_loop_jmp, {}, { branch: this.emitBranch(block) })
        } else {
            this._createBlockFunction(block);
            this.emitIr(ir_yield, { status: CatnipWasmEnumThreadStatus.RUNNING }, { branch: this.emitBranch(block) });
        }
    }

    public emitConditionalJump(block: CatnipIrBasicBlock) {
        const sourceBlock = this._body;
        this.emitIr(ir_if_else, {}, {
            true_branch: this.emitBranch(() => {
                if (sourceBlock.funcNullable === block.funcNullable) {
                    block.isLoop = true;
                    this.emitIr(ir_loop_jmp, {}, { branch: this.emitBranch(block) })
                } else {
                    this._createBlockFunction(block);
                    this.emitIr(ir_yield, { status: CatnipWasmEnumThreadStatus.RUNNING }, { branch: this.emitBranch(block) });
                }
            }),
            false_branch: this.emitBranch(),
        });
    }

    /** Creates a new, empty branch */
    public emitBranch(): CatnipIrBranch;
    /** Creates a new branch and emits all the commands in the command list to it. */
    public emitBranch(commands: CatnipCommandList | null): CatnipIrBranch;
    /** Creates a new branch to the basic block */
    public emitBranch(block: CatnipIrBasicBlock): CatnipIrBranch;
    /** Creates a new branch, switches this context to emit to that branch, calls lambda then switches back to the previous context.  */
    public emitBranch(lambda: (block: CatnipIrBasicBlock) => void): CatnipIrBranch;

    public emitBranch(arg?: null | CatnipIrBasicBlock | CatnipCommandList | ((block: CatnipIrBasicBlock) => void)): CatnipIrBranch {
        let body: CatnipIrBasicBlock;

        if (arg instanceof CatnipIrBasicBlock) {
            body = arg;
        } else {
            body = new CatnipIrBasicBlock();
            if (arg !== undefined && arg !== null) {
                const oldBranch = this._body;
                this._body = body;

                if (Array.isArray(arg)) {
                    this.emitCommands(arg);
                } else {
                    arg(body);
                }

                this._body = oldBranch;
            }
        }

        return { body, branchType: CatnipIrBranchType.INTERNAL, resolved: true };
    }

    public emitTransientCreate(format: CatnipValueFormat, name?: string): CatnipIrTransientVariable {
        const transient = new CatnipIrTransientVariable(this.ir, format, name);
        this.emitIr(ir_transient_create, { transient }, {});
        return transient;
    }

}
