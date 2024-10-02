import { CatnipCompilerIrGenContext } from "../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../compiler/CatnipIrBranch";

export type CatnipCommandList = CatnipCommandOp[];

export type CatnipOpInputs = Record<string, any>;

export interface CatnipOp<TInputs extends CatnipOpInputs = CatnipOpInputs> {
    readonly type: CatnipOpType<TInputs>;
    readonly inputs: TInputs;
}

export interface CatnipCommandOp<TInputs extends CatnipOpInputs = CatnipOpInputs> extends CatnipOp<TInputs> {
    readonly type: CatnipCommandOpType<TInputs>;
}

export interface CatnipInputOp<TInputs extends CatnipOpInputs = CatnipOpInputs> extends CatnipOp<TInputs> {
    readonly type: CatnipInputOpType<TInputs>;
}

export abstract class CatnipOpType<TInputs extends CatnipOpInputs> {
    public abstract create(inputs: TInputs): CatnipOp<TInputs>;
    public abstract getInputsAndSubstacks(ir: CatnipIr, inputs: TInputs): IterableIterator<CatnipOp | CatnipCommandList>;
    
    public *getExternalBranches(ir: CatnipIr, inputs: TInputs): IterableIterator<CatnipIrExternalBranch> {}

    public isYielding(ir: CatnipIr, inputs: TInputs): boolean {
        return false;
    }

    public abstract generateIr(ctx: CatnipCompilerIrGenContext, inputs: TInputs): void;
}

export abstract class CatnipInputOpType<TInputs extends CatnipOpInputs> extends CatnipOpType<TInputs> {
    public create(inputs: TInputs): CatnipInputOp<TInputs> {
        return { type: this, inputs }
    }
}

export abstract class CatnipCommandOpType<TInputs extends CatnipOpInputs> extends CatnipOpType<TInputs> {
    public create(inputs: TInputs): CatnipCommandOp<TInputs> {
        return { type: this, inputs }
    }
}