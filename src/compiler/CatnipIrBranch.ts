import { CatnipCompilerStack } from "../compiler/CatnipCompilerStack";
import { CatnipCompilerLogger } from "../compiler/CatnipCompilerLogger";
import { CatnipIrFunction } from "../compiler/CatnipIrFunction";
import { CatnipIrOp } from "./CatnipIrOp";


export class CatnipIrBranch {

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
            if (!lastOp.type.doesBranchContinue(branchName, lastOp))
                continue;

            let branch = lastOp.branches[branchName];

            if (branch === null) {
                branch = new CatnipIrBranch(this._func ?? undefined);
                lastOp.branches[branchName] = branch;
                branch._appendTails(tails, visited);
            } else {
                if (visited.has(branch)) continue;

                if (tails.indexOf(branch) === -1) // TODO Me thinks this check is not necesary
                    branch._appendTails(tails, visited);
            }
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

    public analyzePreEmit(visited: Set<CatnipIrBranch>) {
        if (visited.has(this)) return;
        visited.add(this);
        let op = this.head;
        while (op !== null) {
            op.type.analyzePreEmit(op, this, visited);
            op = op.next;
        }
    }

    public pushOp(op: CatnipIrOp) {
        CatnipCompilerLogger.assert(op.next === null && op.prev === null);
        CatnipCompilerLogger.assert(this.tail === null || this.tail.next === null);

        if (this.head === null)
            this.head = op;

        op.prev = this.tail;
        op.next = null; // should be unecessary
        
        if (this.tail !== null)
            this.tail.next = op;

        this.tail = op;
    }

}
