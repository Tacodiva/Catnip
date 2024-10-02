import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
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
    abstract readonly resolved: boolean;
    abstract readonly body: CatnipIrBasicBlock;

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

    public get resolved() {
        if (this._body === null)
            this._body = this._tryResolve();
        return this._body !== null;
    } 

    public get body() {
        if (!this.resolved)
            throw new Error("External branch not resolved.");
        return this._body!;
    }

    public constructor() {
        super();
        this._body = null;
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

    protected abstract _tryResolve(): CatnipIrBasicBlock | null;
}

export interface CatnipReadonlyIrInternalBranch extends CatnipIrBranchBase {
    readonly branchType: CatnipIrBranchType.INTERNAL;
    readonly resolved: true;
    readonly body: CatnipIrBasicBlock;
}

export class CatnipIrInternalBranch extends CatnipIrBranchBase implements CatnipReadonlyIrInternalBranch {
    public readonly branchType = CatnipIrBranchType.INTERNAL;
    public readonly resolved = true;
    public body: CatnipIrBasicBlock;

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