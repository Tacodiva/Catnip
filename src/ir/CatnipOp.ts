import { CatnipCompilerIrGenContext } from "../compiler/CatnipCompiler";
import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipInputFlags, CatnipInputFormat } from "./types";

export type CatnipCommandList = CatnipCommandOp[];

export class CatnipIrCommandList {
    public readonly commands: CatnipOpIr[];

    public constructor() {
        this.commands = [];
    }
}

export type CatnipOpInputs = Record<string, any>;

interface CatnipOpBase<TInputs extends CatnipOpInputs = any> {
    readonly type: CatnipOpType<TInputs, any>;
    readonly inputs: TInputs;
}

export type CatnipOp<TInputs extends CatnipOpInputs = any> = CatnipCommandOp<TInputs> | CatnipInputOp<TInputs>;

export interface CatnipCommandOp<TInputs extends CatnipOpInputs = any> extends CatnipOpBase<TInputs> {
    readonly type: CatnipCommandOpType<TInputs, any>;
}

export interface CatnipInputOp<TInputs extends CatnipOpInputs = any> extends CatnipOpBase<TInputs> {
    readonly type: CatnipInputOpType<TInputs, any>;
}


export interface CatnipOpIrBase<TInputs extends CatnipOpInputs = any> {
    readonly type: CatnipOpType<any, TInputs>;
    readonly inputs: TInputs;
}

export type CatnipOpIr<TInputs extends CatnipOpInputs = any> = CatnipCommandOpIr<TInputs> | CatnipInputOpIr<TInputs>;

export interface CatnipCommandOpIr<TInputs extends CatnipOpInputs> extends CatnipOpIrBase<TInputs> {
    readonly type: CatnipCommandOpType<any, TInputs>;
}

export interface CatnipInputOpIr<TInputs extends CatnipOpInputs> extends CatnipOpIrBase<TInputs> {
    readonly type: CatnipInputOpType<any, TInputs>;
    /** The format of the value this op must leave on the stack. */
    readonly format: CatnipInputFormat;
    /** The flags which the value this op leaves on the stack must satisfy.  */
    readonly flags: CatnipInputFlags;
}

export abstract class CatnipOpType<TInputs extends CatnipOpInputs, TIrInputs extends CatnipOpInputs = TInputs> {
    readonly abstract opcode: string;

    public abstract create(inputs: TInputs): CatnipOp<TInputs>;

    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipOpIr<TIrInputs>): void;
}

/**
 * `TInputs` are the inputs to the operation before it's converted into IR.
 * `TIrInputs` are the inputs to the operation once it's in IR form.
 */
export abstract class CatnipInputOpType<TInputs extends CatnipOpInputs, TIrInputs extends CatnipOpInputs> extends CatnipOpType<TInputs, TIrInputs> {
    public create(inputs: TInputs): CatnipInputOp<TInputs> {
        return { type: this, inputs }
    }

    public abstract generateIr(ctx: CatnipCompilerIrGenContext, inputs: TInputs, format: CatnipInputFormat, flags: CatnipInputFlags): void;
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipInputOpIr<TIrInputs>): void;
}

export abstract class CatnipCommandOpType<TInputs extends CatnipOpInputs, TIrInputs extends CatnipOpInputs> extends CatnipOpType<TInputs, TIrInputs> {
    public create(inputs: TInputs): CatnipCommandOp<TInputs> {
        return { type: this, inputs }
    }

    public abstract generateIr(ctx: CatnipCompilerIrGenContext, inputs: TInputs): void;
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipCommandOpIr<TIrInputs>): void;
}