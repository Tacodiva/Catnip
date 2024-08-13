import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../compiler/CatnipCompilerStack";
import { CatnipCompilerState } from "../compiler/CatnipCompilerState";
import { CatnipValueFlags, CatnipValueFormat } from "./types";

export type CatnipIrOpInputs = Record<string, any>;
export type CatnipIrOpBranches = Record<string, CatnipIrBranch | null>;

export interface CatnipIrOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranches = CatnipIrOpBranches, 
    TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
> {
    readonly type: TOpType;
    readonly inputs: TInputs;
    readonly branches: TBranches;

    operands: CatnipCompilerStackElement[];

    next: CatnipIrOp | null;
    prev: CatnipIrOp | null;
}

export type CatnipIrInputOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
    TOpType extends CatnipIrInputOpType<TInputs,TBranches> = CatnipIrInputOpType<TInputs,TBranches>
> = CatnipIrOp<TInputs, TBranches, TOpType>;


export abstract class CatnipIrOpTypeBase<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranches> {
    public readonly name: string;
    public readonly abstract isInput: boolean;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract getOperandCount(inputs: TInputs, branches: TBranches): number;

    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<TInputs, TBranches>, branch: CatnipIrBranch): void;

    public isYielding(ir: CatnipIrOp<TInputs, TBranches>, visited: Set<CatnipIrBranch>): boolean {
        for (const branchName in ir.branches) {
            const branch = ir.branches[branchName];
            if (branch === null || branch.isYielding(visited)) return true;
        }
        return false;
    }

    public doesContinue(ir: CatnipIrOp<TInputs, TBranches>) {
        const branchNames = Object.keys(ir.branches);
        if (branchNames.length === 0) return true;
        for (const branchName of branchNames) {
            if (this.doesBranchContinue(branchName, ir))
                return true;
        }
        return false;
    }

    public doesBranchContinue(branch: keyof TBranches, ir: CatnipIrOp<TInputs, TBranches>): boolean {
        return true;
    }

    public analyzePreEmit(ir: CatnipIrOp<TInputs, TBranches>, branch: CatnipIrBranch, visited: Set<CatnipIrBranch>) {
        for (const subbranchName in ir.branches) {
            const subbranch = ir.branches[subbranchName];
            if (subbranch === null) continue;

            if (subbranch.func !== branch.func) {
                subbranch.func.registerCaller(branch.func);
            }

            subbranch.analyzePreEmit(visited);
        }
    }

    public applyState(ir: CatnipIrOp<TInputs, TBranches>, state: CatnipCompilerState) { }
}

export abstract class CatnipIrInputOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {

    public readonly isInput: true = true;

    public abstract getResult(inputs: TInputs, branches: TBranches, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue;

    public tryCast(ir: CatnipIrOp<TInputs, TBranches, this>, format: CatnipValueFormat, flags: CatnipValueFlags): boolean {
        return false;
    }
}

export abstract class CatnipIrCommandOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {
    public readonly isInput: false = false;

    protected empty() {} // To differentiate this from CatnipIrInputOpType
}

export type CatnipIrOpType<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranches> = CatnipIrInputOpType<TInputs, TBranches> | CatnipIrCommandOpType<TInputs, TBranches>;
