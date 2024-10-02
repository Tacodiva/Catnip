import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIr } from "./CatnipIr";
import { CatnipIrBasicBlock, CatnipReadonlyIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipIrFunction } from "./CatnipIrFunction";

export enum CatnipIrBranchType {
    INTERNAL,
    EXTERNAL
}

export type CatnipIrBranch = CatnipIrInternalBranch | CatnipIrExternalBranch;

export type CatnipReadonlyIrBranch = CatnipReadonlyIrInternalBranch | CatnipReadonlyIrExternalBranch;

abstract class CatnipIrBranchBase {
    abstract readonly branchType: CatnipIrBranchType;
    abstract readonly bodyResolved: boolean;
    abstract readonly body: CatnipIrBasicBlock;
    abstract readonly isYielding: boolean;
    abstract readonly isYieldingResolved: boolean;
    abstract readonly ir: CatnipIr;
    abstract readonly irResolved: boolean;

    public getTails(): CatnipIrBranch[] {
        const tails: CatnipIrBranch[] = [];
        this._appendTails(tails, new Set());
        return tails;
    }

    abstract _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBasicBlock>): void;
}

export interface CatnipReadonlyIrExternalBranch extends CatnipIrBranchBase {
    readonly branchType: CatnipIrBranchType.EXTERNAL;
    readonly returnLocation: CatnipIrBranch | null;
}

export abstract class CatnipIrExternalBranch extends CatnipIrBranchBase implements CatnipReadonlyIrExternalBranch {
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

    private _isYielding: boolean | null;

    public get isYieldingResolved(): boolean {
        if (this._isYielding === null)
            this._isYielding = this._tryResolveIsYielding();
        return this._isYielding !== null;
    }

    public get isYielding(): boolean {
        if (!this.isYieldingResolved)
            throw new Error("External branch yielding not resolved.");
        return this._isYielding!;
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
        this._isYielding = null;
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
    protected abstract _tryResolveIsYielding(): boolean | null;
    protected abstract _tryResolveBlock(): CatnipIrBasicBlock | null;
}

export interface CatnipReadonlyIrInternalBranch extends CatnipIrBranchBase {
    readonly branchType: CatnipIrBranchType.INTERNAL;
    readonly bodyResolved: true;
    readonly isYieldingResolved: true;
    readonly body: CatnipIrBasicBlock;
}

export class CatnipIrInternalBranch extends CatnipIrBranchBase implements CatnipReadonlyIrInternalBranch {
    public readonly branchType = CatnipIrBranchType.INTERNAL;
    public readonly bodyResolved = true;
    public readonly isYieldingResolved = true;
    public readonly irResolved = true;
    public body: CatnipIrBasicBlock;

    public get isYielding(): boolean {
        return this.body.isYielding();
    }

    public get ir(): CatnipIr {
        return this.body.func.ir;
    }

    public constructor(body: CatnipIrBasicBlock) {
        super();
        this.body = body;
    }

    _appendTails(tails: CatnipIrBranch[], visited: Set<CatnipIrBasicBlock>): void {
        if (visited.has(this.body)) return;
        visited.add(this.body);

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