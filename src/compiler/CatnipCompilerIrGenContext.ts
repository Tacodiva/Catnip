import { CatnipOpInputs, CatnipInputOp, CatnipCommandOp, CatnipCommandList } from "../ir";
import { CatnipIrOp, CatnipIrOpBranches, CatnipIrCommandOpType, CatnipIrCommandOp, CatnipIrInputOpType, CatnipIrInputOp, CatnipIrOpInputs, CatnipIrOpBase } from "../ir/CatnipIrOp";
import { ir_nop } from "../ir/ops/core/nop";
import { CatnipInputFormat, CatnipInputFlags } from "../ir/types";
import { createLogger, Logger } from "../log";
import { CatnipCompiler } from "./CatnipCompiler";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { ir_call } from '../ir/ops/core/call';

/*

Compiler Stages:

Stage 1: Generate
    -> All the operations are converted to their IR counterpart
    -> The IR is split up into functions and linked together

Stage 2: Analyse
    -> Inlining!
    -> Constant folding / Dead branch removal
    -> Analyze and place Blocks / Loops 
    -> Type analysis + Simplification

Stage 3: Emit
    -> Each section is converted into WASM

*/

interface CantipIrBranch {
    head: CatnipIrOp;
    tails: CatnipIrOp[];
}

export class CatnipCompilerIrGenContext {
    private static readonly _logger: Logger = createLogger("CatnipCompilerIrGenContext");
    public readonly compiler: CatnipCompiler;

    private _function: CatnipIrFunction | null;
    public functions: CatnipIrFunction[];

    private _head: CatnipIrOp | null;
    private _prev: CatnipIrOp[];
    private _yield: boolean;

    public constructor(compiler: CatnipCompiler) {
        this.compiler = compiler;
        this._prev = [];
        this._head = null;
        this._function = null;
        this.functions = [];
        this._yield = false;
    }

    private _emitIr<TOp extends CatnipIrOpBase<CatnipIrOpInputs, TBranches>, TBranches extends CatnipIrOpBranches>(
        partialOp: Omit<TOp, "branches" | "prev" | "func">,
        branches: { [Key in keyof TBranches]: CantipIrBranch },
        includeNext: boolean
    ): TOp {


        (partialOp as { branches?: CatnipIrOpBranches }).branches = {};
        (partialOp as { prev?: CatnipIrOp[] }).prev = [];

        const op = partialOp as TOp;

        let func = this._function;

        if (this._yield || func === null) {
            func = new CatnipIrFunction(this.compiler, op);
            this._yield = false;
        }
        
        if (func === this._function) {
            for (const prev of this._prev) {
                if (prev.func !== func) {
                    func = new CatnipIrFunction(this.compiler, op);
                    break;
                }
            }
        }

        (op as { func?: CatnipIrFunction }).func = func;

        if (func === this._function) {
            // If we haven't changed functions...
            for (const prev of this._prev) {
                CatnipCompilerIrGenContext._logger.assert(prev.branches.next === undefined);
                prev.branches.next = op;
                op.prev.push(prev);
            }
        } else {
            // We have changed functions, we need to emit a call to each prev

            // If we actually were in a function, emit a call to the new function
            if (this._function !== null && this._prev.length === 0) {
                CatnipCompilerIrGenContext._logger.assert(this._head === null);

                this._emitIr({
                    type: ir_call,
                    inputs: { func },
                }, {}, false);
            } else {
                for (const prev of this._prev) {
                    CatnipCompilerIrGenContext._logger.assert(prev.branches.next === undefined);

                    const callOp: CatnipIrOp = {
                        type: ir_call,
                        inputs: { func },
                        branches: {},
                        prev: [prev],
                        func: prev.func
                    };

                    prev.branches.next = callOp;
                }
            }

            this._function = func;
            this.functions.push(func);
        }

        this._prev.length = 0;

        if (includeNext) this._prev.push(op);

        for (const branchName in branches) {
            const branch = branches[branchName];
            for (const branchTail of branch.tails) {
                this._prev.push(branchTail);
            }
            (op.branches as CatnipIrOpBranches)[branchName] = branch.head;
        }

        if (this._head === null) {
            this._head = op;
        }

        return op;
    }

    public emitIrCommand<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(
        op: CatnipIrCommandOpType<TInputs, TBranches>,
        inputs: TInputs,
        branches: { [Key in keyof TBranches]: CantipIrBranch },
        includeNext: boolean = true
    ): CatnipIrCommandOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrCommandOp<TInputs, TBranches>, TBranches>({
            type: op,
            inputs
        }, branches, includeNext);
    }

    public emitIrInput<TInputs extends CatnipOpInputs, TBranches extends CatnipIrOpBranches>(
        op: CatnipIrInputOpType<TInputs, TBranches>,
        inputs: TInputs,
        format: CatnipInputFormat,
        flags: CatnipInputFlags,
        branches: { [Key in keyof TBranches]: CantipIrBranch },
        includeNext: boolean = true
    ): CatnipIrInputOp<TInputs, TBranches> {
        return this._emitIr<CatnipIrInputOp<TInputs, TBranches>, TBranches>({
            type: op,
            inputs,
            format,
            flags
        }, branches, includeNext);
    }

    public emitYield() {
        this._yield = true;
    }

    public emitInput<TInputs extends CatnipOpInputs>(op: CatnipInputOp<TInputs>, format: CatnipInputFormat, flags: CatnipInputFlags) {
        op.type.generateIr(this, op.inputs, format, flags);
    }

    public emitCommand<TInputs extends CatnipOpInputs>(op: CatnipCommandOp<TInputs>) {
        op.type.generateIr(this, op.inputs);
    }

    public emitBranch(commands: CatnipCommandList): CantipIrBranch {
        const oldPrev = this._prev;
        const oldHead = this._head;
        const oldFunc = this._function;
        const oldYield = this._yield;

        let tails: CatnipIrOp[] = this._prev = [];
        this._head = null;
        this._yield = false;

        for (const command of commands) {
            this.emitCommand(command);
        }

        if (this._yield || this._head === null) {
            this.emitIrCommand(ir_nop, {}, {});
        }
        
        let head = this._head as CatnipIrOp | null;

        CatnipCompilerIrGenContext._logger.assert(head !== null);

        this._prev = oldPrev;
        this._head = oldHead;
        this._function = oldFunc;
        this._yield = oldYield;

        return { head, tails };
    }

}
