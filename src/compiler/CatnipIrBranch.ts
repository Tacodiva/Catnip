import { CatnipCompilerLogger } from "./CatnipCompilerLogger";
import { CatnipIrBasicBlock, CatnipReadonlyIrBasicBlock } from "./CatnipIrBasicBlock";

export enum CatnipIrBranchType {
    INTERNAL,
    EXTERNAL
}

export type CatnipIrBranch = CatnipIrInternalBranch | CatnipIrExternalBranch;

export type CatnipReadonlyIrBranch = CatnipReadonlyIrInternalBranch | CatnipReadonlyIrExternalBranch;

export interface CatnipReadonlyIrExternalBranch {
    readonly branchType: CatnipIrBranchType.EXTERNAL;
    readonly resolved: boolean;
    readonly body: CatnipIrBasicBlock;
}

export abstract class CatnipIrExternalBranch implements CatnipReadonlyIrExternalBranch {
    public readonly branchType = CatnipIrBranchType.EXTERNAL;

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
        this._body = null;
    }

    protected abstract _tryResolve(): CatnipIrBasicBlock | null;
}

export interface CatnipReadonlyIrInternalBranch {
    readonly branchType: CatnipIrBranchType.INTERNAL;
    readonly body: CatnipIrBasicBlock;
}

export interface CatnipIrInternalBranch extends CatnipReadonlyIrInternalBranch {
    readonly branchType: CatnipIrBranchType.INTERNAL;
    readonly resolved: true;
    body: CatnipIrBasicBlock;
}