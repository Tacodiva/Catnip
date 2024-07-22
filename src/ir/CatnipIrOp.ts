import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipInputFlags, CatnipInputFormat } from "./types";
import { CatnipIrBranch } from "./CatnipIrBranch";

export type CatnipIrOpInputs = Record<string, any>;
export type CatnipIrOpBranches = Record<string, CatnipIrBranch>;

export interface CatnipIrOp {
    readonly type: CatnipIrOpType<CatnipIrOpInputs, CatnipIrOpBranches>;
    readonly inputs: CatnipIrOpInputs;

    readonly branches: CatnipIrOpBranches;
}

export interface CatnipIrOpBase<TInputs extends CatnipIrOpInputs = CatnipIrOpInputs, TBranches extends CatnipIrOpBranches = CatnipIrOpBranches> extends CatnipIrOp {
    readonly type: CatnipIrOpType<TInputs, TBranches>;
    readonly inputs: TInputs;
    readonly branches: TBranches;
}

export interface CatnipIrCommandOp<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpBase<TInputs, TBranches> {
    readonly type: CatnipIrCommandOpType<TInputs, TBranches>;
}

export interface CatnipIrInputOp<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpBase<TInputs, TBranches> {
    readonly type: CatnipIrInputOpType<TInputs, TBranches>;
    /** The format of the value this op must leave on the stack. */
    readonly format: CatnipInputFormat;
    /** The flags which the value this op leaves on the stack must satisfy.  */
    readonly flags: CatnipInputFlags;
}

export abstract class CatnipIrOpType<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranches> {
    public readonly name: string;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOpBase<TInputs, TBranches>): void;

    public isYielding(ir: CatnipIrOpBase<TInputs, TBranches>, visited: Set<CatnipIrBranch>): boolean {
        for (const branchName in ir.branches) {
            const branch = ir.branches[branchName];
            if (branch.isYielding(visited)) return true;
        }
        return false;
    }


    public doesContinue(ir: CatnipIrOpBase<TInputs, TBranches>) {
        const branchNames = Object.keys(ir.branches);
        if (branchNames.length === 0) return true;
        for (const branchName of branchNames) {
            if (this.doesBranchContinue(branchName, ir))
                return true;
        }
        return false;
    }

    public doesBranchContinue(branch: keyof TBranches, ir: CatnipIrOpBase<TInputs, TBranches>): boolean {
        return true;
    }
}

export abstract class CatnipIrInputOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpType<TInputs, TBranches> {
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<TInputs, TBranches>): void;
}

export abstract class CatnipIrCommandOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpType<TInputs, TBranches> {
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<TInputs, TBranches>): void;
}