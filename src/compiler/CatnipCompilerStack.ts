import { CatnipCompilerValue } from "./CatnipCompilerValue";
import { CatnipIrInputOp } from "./CatnipIrOp";

export interface CatnipCompilerReadonlyStack {
    peek(): CatnipCompilerValue;
    peek(offset: number): CatnipCompilerValue;
    peekDetailed(): CatnipCompilerStackEntry;
    peekDetailed(offset: number): CatnipCompilerStackEntry;

}

export interface CatnipCompilerStackEntry {
    readonly value: CatnipCompilerValue;
    readonly source: CatnipIrInputOp;
}

export class CatnipCompilerStack implements CatnipCompilerReadonlyStack {

    private readonly _stack: CatnipCompilerStackEntry[];

    public get length() { return this._stack.length; }

    public constructor() {
        this._stack = [];
    }

    public clone(): CatnipCompilerStack {
        const clone = new CatnipCompilerStack();

        clone._stack.push(...this._stack);

        return clone;
    }

    public pop(): CatnipCompilerValue;
    public pop(count: number): CatnipCompilerValue[];

    public pop(count?: number): CatnipCompilerValue | CatnipCompilerValue[] {
        if (count === undefined) {
            if (this._stack.length === 0)
                throw new Error("No values left on stack.");
            return this._stack.pop()!.value;
        } else {
            if (this._stack.length < count)
                throw new Error("Not enough values on stack.");
            return this._stack.splice(this._stack.length - count, count).map(entry => entry.value);
        }
    }

    public popDetailed(): CatnipCompilerStackEntry;
    public popDetailed(count: number): CatnipCompilerStackEntry[];

    public popDetailed(count?: number): CatnipCompilerStackEntry | CatnipCompilerStackEntry[] {
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

    public peek(): CatnipCompilerValue;
    public peek(offset: number): CatnipCompilerValue;

    public peek(offset?: number): CatnipCompilerValue {
        offset ??= 0;
        if (this._stack.length <= offset)
            throw new Error("Not enough values left on stack.");
        return this._stack[this._stack.length - (offset + 1)].value;
    }

    public peekDetailed(): CatnipCompilerStackEntry;
    public peekDetailed(offset: number): CatnipCompilerStackEntry;

    public peekDetailed(offset?: number): CatnipCompilerStackEntry {
        offset ??= 0;
        if (this._stack.length <= offset)
            throw new Error("Not enough values left on stack.");
        return this._stack[this._stack.length - (offset + 1)];
    }

    public push(value: CatnipCompilerValue, source: CatnipIrInputOp) {
        this._stack.push({ value, source });
    }
}