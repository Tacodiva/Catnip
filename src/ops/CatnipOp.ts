import { CatnipCompilerIrGenContext } from "../compiler/CatnipCompilerIrGenContext";
import { CatnipIr } from "../compiler/CatnipIr";
import { CatnipIrExternalBranch } from "../compiler/CatnipIrBranch";
import { IR0Input } from "../compiler/ir0/IR0Node";
import { IR0Script } from "../compiler/ir0/IR0Script";
import { IR0Emitter } from "../compiler/ir0/IR0Emitter";
import { SB3ToIR0Info } from "../compiler/ir0/SB3ToIR0Info";

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

    public abstract getInputsAndSubstacks(inputs: TInputs): IterableIterator<CatnipInputOp | CatnipCommandList>;

    public prepass(script: IR0Script, conversionInfo: SB3ToIR0Info, inputs: TInputs): void {
        for (const inputOrSubstack of this.getInputsAndSubstacks(inputs)) {
            if (Array.isArray(inputOrSubstack)) {
                for (const cmd of inputOrSubstack) {
                    cmd.type.prepass(script, conversionInfo, cmd.inputs);
                }
            } else {
                inputOrSubstack.type.prepass(script, conversionInfo, inputOrSubstack.inputs);
            }
        }
    }
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