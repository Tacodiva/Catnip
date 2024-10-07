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
    readonly source: CatnipIrInputOp | null;
}

export class CatnipCompilerStack implements CatnipCompilerReadonlyStack {

    private readonly _stack: CatnipCompilerStackEntry[];

    public get values(): readonly CatnipCompilerStackEntry[] { return this._stack; }

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

    public push(value: CatnipCompilerValue, source: CatnipIrInputOp | null) {
        this._stack.push({ value, source });
    }

    public isSubsetOf(other: CatnipCompilerStack): boolean {
        if (this.length !== other.length) return false;

        for (let i = 0; i < this.length; i++) {
            const ourEntry = this._stack[i];
            const otherEntry = other._stack[i];

            if (!ourEntry.value.isSubsetOf(otherEntry.value))
                return false;
        }

        return true;
    }

    public or(other: CatnipCompilerStack): CatnipCompilerStack {
        if (this.length !== other.length)
            throw new Error("Incompatible stack length.");

        const newStack = new CatnipCompilerStack();

        for (let i = 0; i < this.length; i++) {
            const ourEntry = this._stack[i];
            const otherEntry = other._stack[i];

            newStack.push(
                ourEntry.value.or(otherEntry.value),
                null
            );
        }

        return newStack;
    }
}