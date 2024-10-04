import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipIrBasicBlock, CatnipReadonlyIrBasicBlock } from "./CatnipIrBasicBlock";
import { CatnipCompilerStackElement, CatnipCompilerValue } from "../compiler/CatnipCompilerStack";
import { CatnipCompilerState } from "../compiler/CatnipCompilerState";
import { CatnipValueFormat } from "./CatnipValueFormat";
import { CatnipIrBranch, CatnipReadonlyIrBranch } from "./CatnipIrBranch";
import { CatnipIrTransientVariable } from "./CatnipIrTransientVariable";
import { CatnipVariable } from "../runtime/CatnipVariable";
import { CatnipTarget } from "../runtime/CatnipTarget";

export type CatnipIrOpInputs = Record<string, any>;
export type CatnipIrOpBranchesDefinition = Record<string, CatnipIrBranch | null>;

export type CatnipIrOpBranches<TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition> = {
    [K in keyof TBranches]: CatnipIrBranch;
}

export type CatnipReadonlyIrOpBranches<TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition> = {
    [K in keyof TBranches]: CatnipReadonlyIrBranch;
}

export interface CatnipReadonlyIrOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition, 
    TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
> {
    readonly type: TOpType;
    readonly inputs: Readonly<TInputs>;
    readonly branches: CatnipReadonlyIrOpBranches<TBranches>;
    readonly block: CatnipReadonlyIrBasicBlock;

    readonly operands: ReadonlyArray<CatnipCompilerStackElement>;

    readonly next: CatnipReadonlyIrOp | null;
    readonly prev: CatnipReadonlyIrOp | null;
    readonly removed?: boolean;
}

export interface CatnipIrOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranchesDefinition = CatnipIrOpBranchesDefinition, 
    TOpType extends CatnipIrOpType<TInputs, TBranches> = CatnipIrOpType<TInputs, TBranches>
> extends CatnipReadonlyIrOp<TInputs, TBranches, TOpType> {
    readonly type: TOpType;
    readonly inputs: TInputs;
    readonly branches: CatnipIrOpBranches<TBranches>;
    block: CatnipIrBasicBlock;

    operands: CatnipCompilerStackElement[];

    next: CatnipIrOp | null;
    prev: CatnipIrOp | null;
    
    removed?: boolean;
}

export type CatnipIrInputOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
    TOpType extends CatnipIrInputOpType<TInputs,TBranches> = CatnipIrInputOpType<TInputs,TBranches>
> = CatnipIrOp<TInputs, TBranches, TOpType>;

export type CatnipReadonlyIrInputOp<
    TInputs extends CatnipIrOpInputs = CatnipIrOpInputs,
    TBranches extends CatnipIrOpBranches = CatnipIrOpBranches,
    TOpType extends CatnipIrInputOpType<TInputs,TBranches> = CatnipIrInputOpType<TInputs,TBranches>
> = CatnipReadonlyIrOp<TInputs, TBranches, TOpType>;


export abstract class CatnipIrOpTypeBase<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranchesDefinition> {
    public readonly name: string;
    public readonly abstract isInput: boolean;

    public constructor(name: string) {
        this.name = name;
    }

    public abstract getOperandCount(inputs: TInputs, branches: CatnipReadonlyIrOpBranches<TBranches>): number;

    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOp<TInputs, TBranches>, branch: CatnipIrBasicBlock): void;

    public isYielding(ir: CatnipIrOp<TInputs, TBranches>, visited: Set<CatnipIrBasicBlock>): boolean {
        for (const branchName in ir.branches) {
            const branch = ir.branches[branchName];
            if (branch.isYielding(visited)) return true;
        }
        return false;
    }

    public doesContinue(ir: CatnipReadonlyIrOp<TInputs, TBranches>) {
        const branchNames = Object.keys(ir.branches);
        if (branchNames.length === 0) return true;
        for (const branchName of branchNames) {
            const branch = ir.branches[branchName];
            if (branch.body.doesContinue())
                return true;
        }
        return false;
    }

    public *getTransientVariables(ir: CatnipReadonlyIrOp<TInputs, TBranches>): IterableIterator<CatnipIrTransientVariable> {}

    public applyState(ir: CatnipReadonlyIrOp<TInputs, TBranches>, state: CatnipCompilerState) { }

    public stringifyInputs(inputs: TInputs): string {
        return JSON.stringify(inputs, (key: string, value: any) => {
            if (value instanceof CatnipVariable) {
                return `<VARIABLE '${value.id}'>`;
            } else if (value instanceof CatnipTarget) {
                return `<TARGET '${value.sprite.id}'>`;
            } else if (value instanceof CatnipIrTransientVariable) {
                return `<TRANSIENT '${value.name}'>`;
            }
            return value;
        })
    }
}

export abstract class CatnipIrInputOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranchesDefinition = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {

    public readonly isInput: true = true;

    public abstract getResult(inputs: TInputs, branches: CatnipReadonlyIrOpBranches<TBranches>, operands: ReadonlyArray<CatnipCompilerStackElement>): CatnipCompilerValue;

    public tryCast(ir: CatnipReadonlyIrOp<TInputs, TBranches, this>, format: CatnipValueFormat): boolean {
        return false;
    }
}

export abstract class CatnipIrCommandOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranchesDefinition = {}> extends CatnipIrOpTypeBase<TInputs, TBranches> {
    public readonly isInput: false = false;

    protected empty() {} // To differentiate this from CatnipIrInputOpType
}

export type CatnipIrOpType<TInputs extends CatnipIrOpInputs, TBranches extends CatnipIrOpBranchesDefinition> = CatnipIrInputOpType<TInputs, CatnipIrOpBranchesDefinition> | CatnipIrCommandOpType<TInputs, CatnipIrOpBranchesDefinition>;
