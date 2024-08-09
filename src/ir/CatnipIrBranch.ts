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

    public readonly ops: CatnipIrOp[];
    public isLoop: boolean;
    public blockDepth: number;

    public constructor(fn?: CatnipIrFunction) {
        this._func = fn ?? null;
        this.ops = [];
        this.isLoop = false;
        this.blockDepth = -1;
    }

    public setFunction(func: CatnipIrFunction) {
        if (this._func === func) return;

        const oldFunc = this._func;
        this._func = func;

        for (const op of this.ops) {
            for (const branchName in op.branches) {
                const branch = op.branches[branchName];
                if (branch !== null && branch._func === oldFunc)
                    branch.setFunction(this._func);
            }
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

        if (this.ops.length === 0) {
            tails.push(this);
            return;
        }

        const lastOp = this.ops[this.ops.length - 1];
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

        for (const op of this.ops) {
            if (op.type.isYielding(op, visited))
                return true;
        }

        return false;
    }

    public doesContinue(): boolean {
        if (this.ops.length === 0) return true;

        const lastOp = this.ops[this.ops.length - 1];
        return lastOp.type.doesContinue(lastOp);
    }

    public analyzePreEmit(visited: Set<CatnipIrBranch>) {
        if (visited.has(this)) return;
        visited.add(this);
        for (const op of this.ops)
            op.type.analyzePreEmit(op, this, visited);
    }

}
