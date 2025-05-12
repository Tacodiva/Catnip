import { CatnipIr } from "./CatnipIr";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";

export enum CatnipIrBranchType {
    INTERNAL,
    EXTERNAL
}

export type CatnipIrBranch = CatnipIrInternalBranch | CatnipIrExternalBranch;

abstract class CatnipIrBranchBase {
    abstract readonly branchType: CatnipIrBranchType;
    abstract readonly bodyResolved: boolean;
    abstract readonly body: CatnipIrBasicBlock;
    abstract readonly ir: CatnipIr;
    abstract readonly irResolved: boolean;

    public getTails(): CatnipIrBranch[] {
        const tails: CatnipIrBranch[] = [];
        this._appendTails(tails, new Set());
        return tails;
    }

    abstract _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBasicBlock>): void;

    public isYielding(visited?: Set<CatnipIrBasicBlock>): boolean {
        visited ??= new Set();
        return this._isYielding(visited);
    }

    protected abstract _isYielding(visited: Set<CatnipIrBasicBlock>): boolean;
}

export abstract class CatnipIrExternalBranch extends CatnipIrBranchBase {
    public readonly branchType = CatnipIrBranchType.EXTERNAL;

    public returnLocation: CatnipIrBranch | null;

    private _body: CatnipIrBasicBlock | null;

    public get bodyResolved(): boolean {
        if (this._body === null)
            this._body = this._tryResolveBlock();
        return this._body !== null;
    }

    public get body() {
        if (!this.bodyResolved)
            throw new Error("External branch body not resolved.");
        return this._body!;
    }

    private _ir: CatnipIr | null;
    public get irResolved(): boolean {
        if (this._ir === null)
            this._ir = this._tryResolveIR();
        return this._ir !== null;
    }

    public get ir(): CatnipIr {
        if (!this.irResolved)
            throw new Error("External branch IR not resolved.");
        return this._ir!;
    }

    public constructor() {
        super();
        this._body = null;
        this._ir = null;
        this.returnLocation = null;
    }

    _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBasicBlock>): void {
        if (this.returnLocation !== null) {
            this.returnLocation._appendTails(tails, visited);
        } else {
            if (visited.has(this.body)) return;
            visited.add(this.body);
            tails.push(this);
        }
    }

    protected abstract _tryResolveIR(): CatnipIr | null;
    protected abstract _tryResolveBlock(): CatnipIrBasicBlock | null;
}

export class CatnipIrInternalBranch extends CatnipIrBranchBase {
    public readonly branchType = CatnipIrBranchType.INTERNAL;
    public readonly bodyResolved = true;
    public readonly isYieldingResolved = true;
    public readonly irResolved = true;
    public body: CatnipIrBasicBlock;
    public isLoop: boolean;

    public get ir(): CatnipIr {
        return this.body.func.ir;
    }

    public constructor(body: CatnipIrBasicBlock, isLoop: boolean = false) {
        super();
        this.body = body;
        this.isLoop = isLoop;
    }

    protected _isYielding(visited?: Set<CatnipIrBasicBlock>): boolean {
        return this.body.isYielding(visited);
    }

    _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBasicBlock>): void {
        if (visited.has(this.body)) return;
        visited.add(this.body);

        if (this.isLoop) return;

        if (this.body.head === null) {
            tails.push(this);
            return;
        }

        const lastOp = this.body.tail!;
        const lastOpBranchNames = Object.keys(lastOp.branches);

        if (lastOp.type.doesContinue(lastOp)) {
            tails.push(this);
            return;
        }

        for (const branchName of lastOpBranchNames) {
            const branch = lastOp.branches[branchName];
            branch._appendTails(tails, visited);
        }
    }
}