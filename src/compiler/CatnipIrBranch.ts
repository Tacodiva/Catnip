import { CatnipCompilerStack } from "../compiler/CatnipCompilerStack";
import { CatnipCompilerLogger } from "../compiler/CatnipCompilerLogger";
import { CatnipIrFunction, CatnipReadonlyIrFunction } from "../compiler/CatnipIrFunction";
import { CatnipIrOp, CatnipIrOpBranches, CatnipIrOpInputs, CatnipIrOpType, CatnipReadonlyIrOp } from "./CatnipIrOp";

export interface CatnipReadonlyIrBranch {
    readonly isLoop: boolean;
    readonly head: CatnipReadonlyIrOp | null;
    readonly tail: CatnipReadonlyIrOp | null;
    readonly func: CatnipReadonlyIrFunction;

    isYielding(visited?: Set<CatnipIrBranch>): boolean;
    doesContinue(): boolean;

    insertOpFirst<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches): CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;

    insertOpLast<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches): CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;

    replaceOp<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(op: CatnipReadonlyIrOp, type: TOpType, inputs: TInputs, branches: TBranches): CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;

    insertOpBefore<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches, after: CatnipReadonlyIrOp): CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;

    insertOpAfter<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(before: CatnipReadonlyIrOp, type: TOpType, inputs: TInputs, branches: TBranches): CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;

    removeOp(op: CatnipReadonlyIrOp): void;
}

export class CatnipIrBranch implements CatnipReadonlyIrBranch {

    private _func: CatnipIrFunction | null;

    public get func(): CatnipIrFunction {
        CatnipCompilerLogger.assert(
            this._func !== null,
            true, "Branch not assigned to a function."
        );
        return this._func;
    }
    public get funcNullable(): CatnipIrFunction | null { return this._func; }

    public head: CatnipIrOp | null;
    public tail: CatnipIrOp | null;

    public isLoop: boolean;
    public blockDepth: number;

    public stack: CatnipCompilerStack;

    public constructor(fn?: CatnipIrFunction) {
        this._func = fn ?? null;
        this.head = null;
        this.tail = null;
        this.isLoop = false;
        this.blockDepth = -1;
        this.stack = new CatnipCompilerStack();
    }

    public setFunction(func: CatnipIrFunction) {
        if (this._func === func) return;

        const oldFunc = this._func;
        this._func = func;

        let op = this.head;
        while (op !== null) {
            for (const branchName in op.branches) {
                const branch = op.branches[branchName];
                if (branch !== null && branch._func === oldFunc)
                    branch.setFunction(this._func);
            }
            op = op.next;
        }
    }

    public get isFuncBody() {
        return this._func !== null && this._func.body === this;
    }

    public getTails(): CatnipIrBranch[] {
        const tails: CatnipIrBranch[] = [];
        this._appendTails(tails, new Set());
        return tails;
    }

    private _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBranch>) {
        visited.add(this);

        if (this.head === null) {
            tails.push(this);
            return;
        }

        const lastOp = this.tail!;
        const lastOpBranchNames = Object.keys(lastOp.branches);

        if (lastOpBranchNames.length === 0 && lastOp.type.doesContinue(lastOp)) {
            tails.push(this);
            return;
        }

        for (const branchName of lastOpBranchNames) {
            let branch = lastOp.branches[branchName];

            if (visited.has(branch)) continue;

            if (tails.indexOf(branch) === -1) // TODO Me thinks this check is not necesary
                branch._appendTails(tails, visited);
        }
    }

    public isYielding(visited?: Set<CatnipIrBranch>): boolean {
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
        CatnipCompilerLogger.assert(op.branch === this);

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
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches): CatnipIrOp<TInputs, TBranches, TOpType> {
        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,

            branch: this,
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
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches): CatnipIrOp<TInputs, TBranches, TOpType> {

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,

            branch: this,
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
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(op: CatnipIrOp, type: TOpType, inputs: TInputs, branches: TBranches): CatnipIrOp<TInputs, TBranches, TOpType> {
        const newOp = this.insertOpAfter(op, type, inputs, branches);
        this.removeOp(op);
        return newOp;
    }

    public insertOpBefore<
        TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(type: TOpType, inputs: TInputs, branches: TBranches, after: CatnipIrOp): CatnipIrOp<TInputs, TBranches, TOpType> {

        CatnipCompilerLogger.assert(after.branch === this, false);
        if (after.branch !== this) {
            return after.branch.insertOpBefore(type, inputs, branches, after);
        }

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,

            branch: this,
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
        TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
        TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
    >(before: CatnipIrOp, type: TOpType, inputs: TInputs, branches: TBranches): CatnipIrOp<TInputs, TBranches, TOpType> {

        CatnipCompilerLogger.assert(before.branch === this, false);
        if (before.branch !== this) {
            return before.branch.insertOpAfter(before, type, inputs, branches);
        }

        const op: CatnipIrOp<TInputs, TBranches, TOpType> = {
            type, inputs, branches,

            branch: this,
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

        CatnipCompilerLogger.assert(op.branch === this, false);
        if (op.branch !== this) {
            return op.branch.removeOp(op);
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
