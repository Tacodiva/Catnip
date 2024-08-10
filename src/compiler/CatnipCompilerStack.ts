import { CatnipIrInputOp } from "../ir/CatnipIrOp";
import { CatnipValueFlags, CatnipValueFormat } from "../ir/types";

export enum CatnipCompilerValueType {
    DYNAMIC,
    CONSTANT
}

export interface CatnipCompilerValueBase {
    type: CatnipCompilerValueType,
    format: CatnipValueFormat,
}

export interface CatnipCompilerDynamicValue extends CatnipCompilerValueBase {
    type: CatnipCompilerValueType.DYNAMIC,
    flags: CatnipValueFlags,
}

export interface CatnipCompilerConstantValue extends CatnipCompilerValueBase {
    type: CatnipCompilerValueType.CONSTANT,
    value: string,
}

export type CatnipCompilerValue = CatnipCompilerDynamicValue | CatnipCompilerConstantValue;

export interface CatnipCompilerReadonlyStack {
    peek(): CatnipCompilerStackElement;
    peek(offset: number): CatnipCompilerStackElement;
}

export type CatnipCompilerStackElement = CatnipCompilerValue & {
    source: CatnipIrInputOp;
}

export class CatnipCompilerStack implements CatnipCompilerReadonlyStack {

    private readonly _stack: CatnipCompilerStackElement[];

    public constructor() {
        this._stack = [];
    }

    public pop(): CatnipCompilerStackElement;
    public pop(count: number): CatnipCompilerStackElement[];

    public pop(count?: number): CatnipCompilerStackElement | CatnipCompilerStackElement[] {
        if (count === undefined) {
            if (this._stack.length === 0)
                throw new Error("No values left on stack.");
            return this._stack.pop()!;
        } else {
            if (this._stack.length < count)
                throw new Error("Not enough values on stack.");
            return this._stack.splice(this._stack.length - count, count);
        }
    }

    public peek(): CatnipCompilerStackElement;
    public peek(offset: number): CatnipCompilerStackElement;

    public peek(offset?: number): CatnipCompilerStackElement {
        offset ??= 0;
        if (this._stack.length <= offset)
            throw new Error("Not enough values left on stack.");
        return this._stack[this._stack.length - (offset + 1)];
    }

    public push(value: CatnipCompilerStackElement) {
        this._stack.push(value);
    }

}