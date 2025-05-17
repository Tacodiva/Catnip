import { CatnipCompilerStack } from "./CatnipCompilerStack";
import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrFunction } from "./CatnipIrFunction";
import { CatnipIrOpBranches, CatnipIrOpBranchesDefinition, CatnipIrOpInputs, CatnipIrOpType, CatnipIrOp } from "./CatnipIrOp";
import { CatnipIrBranchType } from "./CatnipIrBranch";
import { CatnipIr } from "./CatnipIr";

export class CatnipIrBasicBlock {

    private _func: CatnipIrFunction | null;
    public readonly ir: CatnipIr;

    public get func(): CatnipIrFunction {
        CatnipCompilerLogger.assert(
            this._func !== null,
            true, "Basic block not assigned to a function."
        );
        return this._func;
    }
    public get funcNullable(): CatnipIrFunction | null { return this._func; }

    public head: CatnipIrOp | null;
    public tail: CatnipIrOp | null;

    public isLoop: boolean;
    public blockDepth: number;

    public stack: CatnipCompilerStack;

    public constructor(ir: CatnipIr, fn?: CatnipIrFunction) {
        this.ir = ir;
        this._func = fn ?? null;
        this.head = null;
        this.tail = null;
        this.isLoop = false;
        this.blockDepth = -1;
        this.stack = new CatnipCompilerStack();
    }

    public setFunction(func: CatnipIrFunction) {
        if (this._func === func) return;
        
        if (this.isFuncBody)
            throw new Error("Cannot set the function of a func body.");

        const oldFunc = this._func;
        this._func = func;

        let op = this.head;
        while (op !== null) {
            for (const branchName in op.branches) {
                const branch = op.branches[branchName];
                if (branch.body._func === oldFunc) {
                    if (branch.branchType === CatnipIrBranchType.INTERNAL && branch.isLoop)
                        continue;
                    branch.body.setFunction(this._func);
                }
            }
            op = op.next;
        }
    }

    public get isFuncBody() {
        return this._func !== null && this._func.body === this;
    }

    public isYielding(visited?: Set<CatnipIrBasicBlock>): boolean {
        visited ??= new Set();

        if (visited.has(this)) {
            return false;
        }

        visited.add(this);

        let op = this.head;
        while (op !== null) {
            if (op.type.isYielding(op, visited))
                return true;
            op = op.next;
        }

        return false;
    }

    public doesContinue(): boolean {
        if (this.head === null) return true;

        const lastOp = this.tail!;
        return lastOp.type.doesContinue(lastOp);
    }

    public pushOp(op: CatnipIrOp) {
        CatnipCompilerLogger.assert(op.next === null && op.prev === null);
        CatnipCompilerLogger.assert(this.tail === null || this.tail.next === null);
        CatnipCompilerLogger.assert(op.block === this);

        if (this.head === null)
            this.head = op;

        op.prev = this.tail;
        op.next = null; // should be unecessary

        if (this.tail !== null)
            this.tail.next = op;

        this.tail = op;
    }

    public insertOpFirst<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: CatnipIrOpBranches<TBranches>): CatnipIrOp<TInputs, TBranches, TOpType> {
        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,
            ir: this.ir,

            block: this,
            next: this.head,
            prev: null,

            operands: [],

            removed: false
        };

        if (this.head === null) {
            this.tail = op;
        } else {
            this.head.prev = op;
        }

        this.head = op;

        return op;
    }

    public insertOpLast<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: CatnipIrOpBranches<TBranches>): CatnipIrOp<TInputs, TBranches, TOpType> {

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,
            ir: this.ir,

            block: this,
            next: null,
            prev: this.tail,

            operands: [],

            removed: false
        };

        if (this.tail === null) {
            this.head = op;
        } else {
            this.tail.next = op;
        }

        this.tail = op;

        return op;
    }

    public replaceOp<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(op: CatnipIrOp, type: TOpType, inputs: TInputs, branches: CatnipIrOpBranches<TBranches>): CatnipIrOp<TInputs, TBranches, TOpType> {
        const newOp = this.insertOpAfter(op, type, inputs, branches);
        this.removeOp(op);
        return newOp;
    }

    public insertOpBefore<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: CatnipIrOpBranches<TBranches>, after: CatnipIrOp): CatnipIrOp<TInputs, TBranches, TOpType> {

        CatnipCompilerLogger.assert(after.block === this, false);
        if (after.block !== this) {
            return after.block.insertOpBefore(type, inputs, branches, after);
        }

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,
            ir: this.ir,

            block: this,
            next: after,
            prev: after.prev,

            operands: [],

            removed: false
        };

        if (after.prev === null) {
            CatnipCompilerLogger.assert(after === this.head);
            this.head = op;
        } else {
            after.prev.next = op;
        }

        after.prev = op;

        return op;
    }

    public insertOpAfter<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(before: CatnipIrOp, type: TOpType, inputs: TInputs, branches: CatnipIrOpBranches<TBranches>): CatnipIrOp<TInputs, TBranches, TOpType> {

        CatnipCompilerLogger.assert(before.block === this, false);
        if (before.block !== this) {
            return before.block.insertOpAfter(before, type, inputs, branches);
        }

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,
            ir: this.ir,

            block: this,
            next: before.next,
            prev: before,

            operands: [],

            removed: false
        };

        if (before.next === null) {
            CatnipCompilerLogger.assert(before === this.tail);
            this.tail = op;
        } else {
            before.next.prev = op;
        }

        before.next = op;

        return op;
    }

    public removeOp(op: CatnipIrOp): void {

        CatnipCompilerLogger.assert(op.block === this, false);
        if (op.block !== this) {
            return op.block.removeOp(op);
        }

        if (op.prev === null) {
            CatnipCompilerLogger.assert(op === this.head);
            this.head = op.next;
        } else {
            op.prev.next = op.next;
        }

        if (op.next === null) {
            CatnipCompilerLogger.assert(op === this.tail);
            this.tail = op.prev;
        } else {
            op.next.prev = op.prev;
        }

        op.removed = true;
        op.next = null;
        op.prev = null;
    }

}