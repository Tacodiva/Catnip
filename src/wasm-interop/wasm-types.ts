


export interface WasmType<TValue, TValueWrapper extends WasmValueWrapper<any>, TSetValue = TValue> {
    readonly size: number | null;
    readonly name: string;
    readonly alignment: number;

    set(ptr: number, buffer: DataView, value: TSetValue): void;
    get(ptr: number, buffer: DataView): TValue;

    getWrapper(ptr: number, buffer: DataView): TValueWrapper;

}

export type WasmTypeValue<T extends WasmType<any, any, any>> = T extends WasmType<infer TValue, any, any> ? TValue : never;
export type WasmTypeSetValue<T extends WasmType<any, any, any>> = T extends WasmType<any, any, infer TValue> ? TValue : never;
export type WasmTypeValueWrapper<T extends WasmType<any, any, any>> = T extends WasmType<any, infer TWrapper, any> ? TWrapper : never;

function alignOffset(offset: number, alignment: number) {
    if (alignment == 0) return offset;
    const remainder = offset % alignment;
    if (remainder == 0) return offset;
    return offset + alignment - remainder;
}

export class WasmValueWrapper<TValueType extends WasmType<any, any>> {
    public readonly ptr: number;
    public readonly buffer: DataView;
    public readonly type: TValueType;

    constructor(ptr: number, buffer: DataView, type: TValueType) {
        this.ptr = ptr;
        this.buffer = buffer;
        this.type = type;
    }

    set(value: WasmTypeSetValue<TValueType>): void {
        this.type.set(this.ptr, this.buffer, value);
    }

    get(): WasmTypeValue<TValueType> {
        return this.type.get(this.ptr, this.buffer);
    }
}

export const WasmFloat64 = {
    size: 8,
    name: "float64",
    alignment: 8,

    set(ptr: number, buffer: DataView, value: number): void {
        buffer.setFloat64(ptr, value, true);
    },

    get(ptr: number, buffer: DataView): number {
        return buffer.getFloat64(ptr, true);
    },

    getWrapper(ptr: number, buffer: DataView): WasmValueWrapper<WasmType<number, any>> {
        return new WasmValueWrapper(ptr, buffer, this);
    }
} satisfies WasmType<number, WasmValueWrapper<WasmType<number, any>>>;

export const WasmFloat32 = {
    size: 4,
    name: "float32",
    alignment: 4,

    set(ptr: number, buffer: DataView, value: number): void {
        buffer.setFloat32(ptr, value, true);
    },

    get(ptr: number, buffer: DataView): number {
        return buffer.getFloat32(ptr, true);
    },

    getWrapper(ptr: number, buffer: DataView): WasmValueWrapper<WasmType<number, any>> {
        return new WasmValueWrapper(ptr, buffer, this);
    }
} satisfies WasmType<number, WasmValueWrapper<WasmType<number, any>>>;

export const WasmInt32 = {
    size: 4,
    name: "int32",
    alignment: 4,

    set(ptr: number, buffer: DataView, value: number): void {
        buffer.setInt32(ptr, value, true);
    },

    get(ptr: number, buffer: DataView): number {
        return buffer.getInt32(ptr, true);
    },

    getWrapper(ptr: number, buffer: DataView): WasmValueWrapper<WasmType<number, any>> {
        return new WasmValueWrapper(ptr, buffer, this);
    }
} satisfies WasmType<number, WasmValueWrapper<WasmType<number, any>>>;

export const WasmUInt32 = {
    size: 4,
    name: "uint32",
    alignment: 4,

    set(ptr: number, buffer: DataView, value: number): void {
        buffer.setUint32(ptr, value, true);
    },

    get(ptr: number, buffer: DataView): number {
        return buffer.getUint32(ptr, true);
    },

    getWrapper(ptr: number, buffer: DataView): WasmValueWrapper<WasmType<number, any>> {
        return new WasmValueWrapper(ptr, buffer, this);
    }
} satisfies WasmType<number, WasmValueWrapper<WasmType<number, any>>>;

export const WasmUInt8 = {
    size: 1,
    name: "uint8",
    alignment: 1,

    set(ptr: number, buffer: DataView, value: number): void {
        buffer.setUint8(ptr, value);
    },

    get(ptr: number, buffer: DataView): number {
        return buffer.getUint8(ptr);
    },

    getWrapper(ptr: number, buffer: DataView): WasmValueWrapper<WasmType<number, any>> {
        return new WasmValueWrapper(ptr, buffer, this);
    }
} satisfies WasmType<number, WasmValueWrapper<WasmType<number, any>>>;

export const WasmVoid = {
    size: null,
    name: "void",
    alignment: 0,

    set(ptr: number, buffer: DataView, value: never): never {
        throw new Error("Cannot set void to a value.");
    },

    get(ptr: number, buffer: DataView): never {
        throw new Error("Cannot get the value of void.");
    },

    getWrapper(ptr: number, buffer: DataView): never {
        throw new Error("Cannot create a wrapper around type void.");
    }
} satisfies WasmType<never, never>;

export class WasmPtrWrapper<TValue extends WasmType<any, any>> extends WasmValueWrapper<WasmPtr<TValue>> {
    public setInner(value: WasmTypeSetValue<TValue>) {
        this.type.setInner(this.ptr, this.buffer, value);
    }

    public getInner(): WasmTypeValue<TValue> {
        return this.type.getInner(this.ptr, this.buffer);
    }

    public getInnerWrapper(): WasmTypeValueWrapper<TValue> {
        return this.type.getInnerWrapper(this.ptr, this.buffer);
    }
}

export class WasmPtr<TValue extends WasmType<any, any>> implements WasmType<number, WasmPtrWrapper<TValue>> {
    public static readonly size: number = 4;
    public readonly size: number = 4;
    public readonly name: string;
    public readonly type: TValue;
    public static readonly alignment: number = 4;
    public readonly alignment: number = 4;

    public constructor(type: TValue) {
        this.name = type.name + "*";
        this.type = type;
    }

    public static set(ptr: number, buffer: DataView, value: number): void {
        WasmUInt32.set(ptr, buffer, value);
    }

    public set(ptr: number, buffer: DataView, value: number): void {
        WasmUInt32.set(ptr, buffer, value);
    }

    public static get(ptr: number, buffer: DataView): number {
        return WasmUInt32.get(ptr, buffer);
    }

    public get(ptr: number, buffer: DataView): number {
        return WasmUInt32.get(ptr, buffer);
    }

    public setInner(ptr: number, buffer: DataView, value: WasmTypeSetValue<TValue>) {
        this.type.set(this.get(ptr, buffer), buffer, value);
    }

    public getInner(ptr: number, buffer: DataView): WasmTypeValue<TValue> {
        return this.type.get(this.get(ptr, buffer), buffer);
    }

    public getInnerWrapper(ptr: number, buffer: DataView): WasmTypeValueWrapper<TValue> {
        return this.type.getWrapper(this.get(ptr, buffer), buffer);
    }

    public getWrapper(ptr: number, buffer: DataView): WasmPtrWrapper<TValue> {
        return new WasmPtrWrapper(ptr, buffer, this);
    }
}

export const WasmPtrVoid = new WasmPtr(WasmVoid);

export class WasmArrayWrapper<TValue extends WasmType<any, any>> extends WasmValueWrapper<WasmArray<TValue>> {
    public setElement(index: number, value: WasmTypeSetValue<TValue>) {
        this.type.setElement(this.ptr, this.buffer, index, value);
    }

    public getElement(index: number): WasmTypeValue<TValue> {
        return this.type.getElement(this.ptr, this.buffer, index);
    }

    public getElementWrapper(index: number): WasmTypeValueWrapper<TValue> {
        return this.type.getElementWrapper(this.ptr, this.buffer, index);
    }
}

export class WasmArray<TInnerType extends WasmType<any, any>> implements WasmType<WasmTypeValue<TInnerType>[], WasmArrayWrapper<TInnerType>, WasmTypeSetValue<TInnerType>[]> {
    public readonly size: number | null;
    public readonly name: string;
    public readonly elementType: TInnerType;
    public readonly elementSize: number;
    public readonly length: number | null;
    public readonly alignment: number;

    public constructor(innerType: TInnerType, length: number | null) {
        if (innerType.size === null)
            throw new Error(`Cannot create list of type '${innerType.name}' because it has an undefined size.`);
        this.name = innerType.name + `[${length}]`;
        this.elementSize = innerType.size;
        this.size = length == null ? null : this.elementSize * length;
        this.length = length;
        this.elementType = innerType;
        this.alignment = alignOffset(this.elementSize, this.elementType.alignment);
    }

    public set(ptr: number, buffer: DataView, value: WasmTypeSetValue<TInnerType>[]): void {
        if (value.length != this.length) throw new Error(`List wrong length. Expected ${this.length} but got ${value.length}`);

        for (let i = 0; i < this.length; i++) {
            this.elementType.set(ptr + (i * this.elementSize), buffer, value[i]);
        }
    }

    public get(ptr: number, buffer: DataView, length?: number): WasmTypeValue<TInnerType>[] {
        if (length === undefined) {
            if (this.length === null) throw new Error("Cannot get the contents of an array of undefined length without providing a length.");
            length = this.length;
        }
        let value = [];
        for (let i = 0; i < length; i++) {
            value[i] = this.elementType.get(ptr + (i * this.elementSize), buffer);
        }
        return value;
    }

    private _boundsCheck(index: number) {
        if (index < 0 || (this.length !== null && index >= this.length))
            throw new Error(`Array index ${index} out of bounds.`);
    }

    public setElement(ptr: number, buffer: DataView, index: number, value: WasmTypeSetValue<TInnerType>) {
        this._boundsCheck(index);
        this.elementType.set(ptr + (this.elementSize * index), buffer, value);
    }

    public getElement(ptr: number, buffer: DataView, index: number): WasmTypeValue<TInnerType> {
        this._boundsCheck(index);
        return this.elementType.get(ptr + (this.elementSize * index), buffer);
    }

    public getElementWrapper(ptr: number, buffer: DataView, index: number): WasmTypeValueWrapper<TInnerType> {
        this._boundsCheck(index);
        return this.elementType.getWrapper(ptr + (this.elementSize * index), buffer);
    }

    public getWrapper(ptr: number, buffer: DataView): WasmArrayWrapper<TInnerType> {
        return new WasmArrayWrapper(ptr, buffer, this);
    }
}

export type WasmStructMembersDefinition = Record<string, WasmType<any, any>>;
export type WasmStructValue<TDef extends WasmStructMembersDefinition> = { [Key in keyof TDef]: WasmTypeValue<TDef[Key]> }

export class WasmStructWrapper<
    TStruct extends WasmStruct<TMembers>,
    TMembers extends WasmStructMembersDefinition =
    TStruct extends WasmStruct<infer DefaultMembers> ? DefaultMembers : never
> extends WasmValueWrapper<WasmStruct<TMembers>> {
    public getMember<MemberName extends keyof TMembers>(memberName: MemberName): WasmTypeValue<TMembers[MemberName]> {
        return this.type.getMember(this.ptr, this.buffer, memberName);
    }

    public setMember<MemberName extends keyof TMembers>(memberName: MemberName, value: WasmTypeSetValue<TMembers[MemberName]>) {
        this.type.setMember(this.ptr, this.buffer, memberName, value);
    }

    public getMemberWrapper<MemberName extends keyof TMembers>(memberName: MemberName): WasmTypeValueWrapper<TMembers[MemberName]> {
        return this.type.getMemberWrapper(this.ptr, this.buffer, memberName);
    }
}

export class WasmStruct<TMembers extends WasmStructMembersDefinition> implements WasmType<WasmStructValue<WasmStructMembersDefinition>, WasmStructWrapper<any, TMembers>, Partial<WasmStructValue<TMembers>>> {

    public readonly name: string;
    public readonly size: TMembers[keyof TMembers]["size"];
    public readonly alignment: number;

    public readonly members: {
        [TMember in keyof TMembers]: {
            offset: number,
            type: TMembers[TMember]
        }
    };

    public constructor(name: string, memberDefinition: TMembers) {
        this.name = name;

        let members: any = {};
        let offset: number | null = 0;
        let lastMemberName: string | null = null;
        let alignment: number = 1;

        for (const memberName in memberDefinition) {
            const member = memberDefinition[memberName];

            if (offset === null)
                throw new Error(`Struct member ${lastMemberName} with undefined size must be the last member of the struct.`);

            offset = alignOffset(offset, member.alignment);
            if (member.alignment > alignment) alignment = member.alignment;

            members[memberName] = {
                offset,
                type: member
            };

            if (member.size == null) offset = null;
            else offset += member.size;

            lastMemberName = memberName;
        }

        this.alignment = alignment;
        this.members = members;
        this.size = offset;
    }

    public set(ptr: number, buffer: DataView, value: Partial<WasmStructValue<TMembers>>): void {
            for (const memberName in value) {
            const member = this.members[memberName];
            member.type.set(ptr + member.offset, buffer, value[memberName]);
        }
    }

    public get(ptr: number, buffer: DataView): WasmStructValue<TMembers> {
        let value: any = {};
        for (const memberName in this.members) {
            const member = this.members[memberName];
            value[memberName] = member.type.get(ptr + member.offset, buffer);
        }
        return value;
    }

    public getMember<MemberName extends keyof TMembers>(ptr: number, buffer: DataView, memberName: MemberName): WasmTypeValue<TMembers[MemberName]> {
        const member = this.members[memberName];
        return member.type.get(ptr + member.offset, buffer);
    }

    public setMember<MemberName extends keyof TMembers>(ptr: number, buffer: DataView, memberName: MemberName, value: WasmTypeSetValue<TMembers[MemberName]>): void {
        const member = this.members[memberName];
        return member.type.set(ptr + member.offset, buffer, value);
    }

    public getMemberWrapper<MemberName extends keyof TMembers>(ptr: number, buffer: DataView, memberName: MemberName): WasmTypeValueWrapper<TMembers[MemberName]> {
        const member = this.members[memberName];
        return member.type.getWrapper(ptr + member.offset, buffer);
    }

    public getWrapper(ptr: number, buffer: DataView): WasmStructWrapper<WasmStruct<TMembers>> {
        return new WasmStructWrapper(ptr, buffer, this);
    }

    public toString(): string {
        let string = `struct ${this.name} {\n`;

        for (const memberName in this.members) {
            const member = this.members[memberName];
            string += `  ${member.type.name} ${memberName};\n`;
        }

        return string + "}";
    }
}