import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipCompilerValue } from "./CatnipCompilerValue";
import { CatnipCompilerState } from "../compiler/CatnipCompilerState";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipIrBranch } from "./CatnipIrBranch";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipTarget } from "../runtime/CatnipTarget";
import { CatnipList } from "../runtime/CatnipList";

export type CatnipIrOpInputs = Record<string, any>;
export type CatnipIrOpBranchesDefinition = Record<string, CatnipIrBranch | null>;

export type CatnipIrOpBranches<TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition> = {
    [K in keyof TBranches]: CatnipIrBranch;
}

export interface CatnipIrOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition, 
    TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
> {
    readonly type: TOpType;
    readonly inputs: TInputs;
    readonly branches: CatnipIrOpBranches<TBranches>;
    block: CatnipIrBasicBlock;

    operands: CatnipCompilerValue[];

    next: CatnipIrOp | null;
    prev: CatnipIrOp | null;
    
    removed?: boolean;
}

export type CatnipIrInputOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
    TOpType extends CatnipIrInputOpType<TInputs,TBranches> = CatnipIrInputOpType<TInputs,TBranches>
> = CatnipIrOp<TInputs, TBranches, TOpType>;

export abstract class CatnipIrOpTypeBase<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranchesDefinition> {
    public readonly name: string;
    public readonly abstract isInput: boolean;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract getOperandCount(inputs: TInputs, branches: CatnipIrOpBranches<TBranches>): number;

    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<TInputs, TBranches>, block: CatnipIrBasicBlock): void;

    public isYielding(ir: CatnipIrOp<TInputs, TBranches>, visited: Set<CatnipIrBasicBlock>): boolean {
        for (const branchName in ir.branches) {
            const branch = ir.branches[branchName];
            if (branch.isYielding(visited)) return true;
        }
        return false;
    }

    public doesContinue(ir: CatnipIrOp<TInputs, TBranches>) {
        const branchNames = Object.keys(ir.branches);
        if (branchNames.length === 0) return true;
        for (const branchName of branchNames) {
            const branch = ir.branches[branchName];
            if (branch.body.doesContinue())
                return true;
        }
        return false;
    }

    public *getTransientVariables(ir: CatnipIrOp<TInputs, TBranches>): IterableIterator<CatnipIrTransientVariable> {}

    public applyState(ir: CatnipIrOp<TInputs, TBranches>, state: CatnipCompilerState) { }

    public stringifyInputs(inputs: TInputs): string {
        return JSON.stringify(inputs, (key: string, value: any) => {
            if (value instanceof CatnipVariable) {
                return `<VARIABLE '${value.name}'>`;
            } else if (value instanceof CatnipList) {
                return `<LIST '${value.name}'>`;
            } else if (value instanceof CatnipTarget) {
                return `<TARGET '${value.sprite.name}'>`;
            } else if (value instanceof CatnipIrTransientVariable) {
                return `<TRANSIENT '${value.name}'>`;
            }
            return value;
        })
    }

    public isBarrier(ir: CatnipIrOp<TInputs, TBranches>): boolean {
        return false;
    }
}

export abstract class CatnipIrInputOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranchesDefinition = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {

    public readonly isInput: true = true;

    public abstract getResult(ir: CatnipIrInputOp<TInputs, CatnipIrOpBranches<TBranches>, this>, state?: CatnipCompilerState): CatnipCompilerValue;

    public tryCast(ir: CatnipIrOp<TInputs, TBranches, this>, format: CatnipValueFormat): boolean {
        return false;
    }
}

export abstract class CatnipIrCommandOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranchesDefinition = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {
    public readonly isInput: false = false;

    protected empty() {} // To differentiate this from CatnipIrInputOpType
}

export type CatnipIrOpType<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranchesDefinition> = CatnipIrInputOpType<TInputs, CatnipIrOpBranchesDefinition> | CatnipIrCommandOpType<TInputs, CatnipIrOpBranchesDefinition>;
