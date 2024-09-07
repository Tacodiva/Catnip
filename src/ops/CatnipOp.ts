import { CatnipCompilerIrGenContext } from "../compiler/CatnipCompilerIrGenContext";

export type CatnipCommandList = CatnipCommandOp[];

export type CatnipOpInputs = Record<string, any>;

interface CatnipOp<TInputs extends CatnipOpInputs = CatnipOpInputs> {
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
}

export abstract class CatnipInputOpType<TInputs extends CatnipOpInputs> extends CatnipOpType<TInputs> {
    public create(inputs: TInputs): CatnipInputOp<TInputs> {
        return { type: this, inputs }
    }

    public abstract generateIr(ctx: CatnipCompilerIrGenContext, inputs: TInputs): void;
}

export abstract class CatnipCommandOpType<TInputs extends CatnipOpInputs> extends CatnipOpType<TInputs> {
    public create(inputs: TInputs): CatnipCommandOp<TInputs> {
        return { type: this, inputs }
    }

    public abstract generateIr(ctx: CatnipCompilerIrGenContext, inputs: TInputs): void;
}