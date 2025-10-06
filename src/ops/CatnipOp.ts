import { CatnipCompilerIrGenContext } from "../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../compiler/CatnipIrBranch";
import { IR0Input } from "../compiler/ir0/IR0";
import { IR0Emitter } from "../compiler/ir0/IR0Emitter";

export type CatnipCommandList = CatnipCommandOp[];

export type CatnipOpInputs = Record<string, any>;

export interface CatnipOp<TInputs extends CatnipOpInputs = CatnipOpInputs> {
    readonly inputs: Readonly<TInputs>;
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

    public abstract generateIr(ctx: IR0Emitter, inputs: TInputs): IR0Input;
}

export abstract class CatnipCommandOpType<TInputs extends CatnipOpInputs> extends CatnipOpType<TInputs> {
    public create(inputs: TInputs): CatnipCommandOp<TInputs> {
        return { type: this, inputs }
    }

    public abstract generateIr(ctx: IR0Emitter, inputs: TInputs): void;
}