import { CatnipOpInputs, CatnipInputOp, CatnipCommandOp, CatnipCommandList } from "../ir";
import { CatnipIrOpBranches, CatnipIrCommandOpType, CatnipIrCommandOp, CatnipIrInputOpType, CatnipIrInputOp, CatnipIrOpInputs, CatnipIrOpBase, CatnipIrBranch } from "../ir/CatnipIrOp";
import { ir_call } from "../ir/ops/core/call";
import { ir_yield } from "../ir/ops/core/yield";
import { CatnipInputFormat, CatnipInputFlags } from "../ir/types";
import { createLogger, Logger } from "../log";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrFunction } from "./CatnipIrFunction";

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
    private _function: CatnipIrFunction;

    private _branch: CatnipIrBranch;
    private _tails: CatnipIrBranch[];

    public constructor(compiler: CatnipCompiler, func: CatnipIrFunction) {
        this.compiler = compiler;
        this._function = func;
        this.functions = [this._function];
        this._branch = this._function.body;
        this._tails = [];
    }

    private _emitIr<TOp extends CatnipIrOpBase<CatnipIrOpInputs, TBranches>, TBranches extends CatnipIrOpBranches>(
        op: TOp
    ): TOp {

        for (const branch of this._tails) {
            if (branch.func !== this._function) {

                this._switchToFunction(this._createFunction(false));

                for (const branch of this._tails) {
                    branch.ops.push({
                        type: ir_call,
                        inputs: {},
                        branches: { func: this._function.body },
                    });
                }

                break;
            }
        }

        this._branch.ops.push(op);

        this._branch.tails.length = 0;

        const branchNames = Object.keys(op.branches);
        if (branchNames.length === 0) {
            this._branch.tails.push(this._branch);
        } else {
            for (const branchName of branchNames) {
                this._branch.tails.push(...op.branches[branchName].tails);
            }
        }

        this._tails = this._branch.tails;

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

    public emitYield() {
        const func = this._createFunction(true);
        this.emitIrCommand(ir_yield, {}, { func: func.body });
        this._switchToFunction(func);
    }

    private _createFunction(needsFunctionTableIndex: boolean): CatnipIrFunction {
        const func = new CatnipIrFunction(this.compiler, needsFunctionTableIndex);
        this.functions.push(func);
        return func;
    }

    private _switchToFunction(func: CatnipIrFunction) {
        this._function = func;
        this._branch = func.body;
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipInputFormat, flags: CatnipInputFlags) {
        op.type.generateIr(this, op.inputs, format, flags);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitBranch(commands: CatnipCommandList): CatnipIrBranch {
        const oldFunc = this._function;
        const oldBranch = this._branch;
        const oldTails = this._tails;

        let branch: CatnipIrBranch = this._branch = new CatnipIrBranch(this._function);

        for (const command of commands) {
            this.emitCommand(command);
        }

        this._function = oldFunc;
        this._branch = oldBranch;
        this._tails = oldTails;

        return branch;
    }

}
