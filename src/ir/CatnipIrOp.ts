import { CatnipCompilerWasmGenContext } from "../compiler/CatnipCompilerWasmGenContext";
import { CatnipInputFlags, CatnipInputFormat } from "./types";

export type CatnipIrOpInputs = Record<string, any>;
export type CatnipIrOpBranches = Record<string, CatnipIrOp> & { next?: never };

export interface CatnipIrOp {
    readonly type: CatnipIrOpType<CatnipIrOpInputs, CatnipIrOpBranches>;
    readonly inputs: CatnipIrOpInputs;

    readonly branches: Omit<CatnipIrOpBranches, "next"> & { next?: CatnipIrOp };
    readonly prev: CatnipIrOp[];
}

export interface CatnipIrOpBase<TInputs extends CatnipIrOpInputs = CatnipIrOpInputs, TBranches extends CatnipIrOpBranches = CatnipIrOpBranches> extends CatnipIrOp {
    readonly type: CatnipIrOpType<TInputs, TBranches>;
    readonly inputs: TInputs;

    readonly branches: Omit<TBranches, "next"> & { next?: CatnipIrOp };
    readonly prev: CatnipIrOp[];
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
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrOpBase<TInputs, TBranches>): void;
}

export abstract class CatnipIrInputOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpType<TInputs, TBranches> {
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrInputOp<TInputs, TBranches>): void;
}

export abstract class CatnipIrCommandOpType<TInputs extends CatnipIrOpInputs = {}, TBranches extends CatnipIrOpBranches = {}> extends CatnipIrOpType<TInputs, TBranches> {
    public abstract generateWasm(ctx: CatnipCompilerWasmGenContext, ir: CatnipIrCommandOp<TInputs, TBranches>): void;
}