import { CatnipIrInputOp, CatnipReadonlyIrInputOp } from "./CatnipIrOp";
import { CatnipValueFormat } from "./CatnipValueFormat";

export interface CatnipCompilerValueBase {
    isConstant: boolean,
    format: CatnipValueFormat,
}

export interface CatnipCompilerDynamicValue extends CatnipCompilerValueBase {
    isConstant: false,
}

export interface CatnipCompilerConstantValue extends CatnipCompilerValueBase {
    isConstant: true,
    value: string | number,
}

export type CatnipCompilerValue = CatnipCompilerDynamicValue | CatnipCompilerConstantValue;

export interface CatnipCompilerReadonlyStack {
    peek(): CatnipCompilerStackElement;
    peek(offset: number): CatnipCompilerStackElement;
}

export type CatnipCompilerStackElement = Readonly<CatnipCompilerValue> & {
    readonly source: CatnipReadonlyIrInputOp;
}

export class CatnipCompilerStack implements CatnipCompilerReadonlyStack {

    private readonly _stack: CatnipCompilerStackElement[];

    public get length() { return this._stack.length; }

    public constructor() {
        this._stack = [];
    }

    public clone(): CatnipCompilerStack {
        const clone = new CatnipCompilerStack();

        clone._stack.push(...this._stack);

        return clone;
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