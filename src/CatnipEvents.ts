import { SpiderNumberType, SpiderValueType } from "wasm-spider";
import { CatnipRuntimeModule } from './runtime/CatnipRuntimeModule';
import { CatnipWasmStructHeapString } from "./wasm-interop/CatnipWasmStructHeapString";
import { CatnipValueFormat } from "./compiler/CatnipValueFormat";

export interface CatnipEventValueTypeInfo<TJavascript = any> {
    readonly format: CatnipValueFormat;

    decodeWASM(runtime: CatnipRuntimeModule, value: any): TJavascript;
    encodeWASM(runtime: CatnipRuntimeModule, value: TJavascript): any;
}

function createValueTypeInfo<TJavascript>(
    format: CatnipValueFormat,
    decodeWASM: (runtime: CatnipRuntimeModule, value: any) => TJavascript,
    encodeWASM: (runtime: CatnipRuntimeModule, value: TJavascript) => any
): CatnipEventValueTypeInfo<TJavascript> {
    return {
        format,
        encodeWASM,
        decodeWASM
    }
}

const TEXT_DECODER = new TextDecoder("utf-8");


export const CatnipEventValueTypes = {
    NUMBER: createValueTypeInfo<number>(
        CatnipValueFormat.F64_NUMBER,
        (rt, value: number) => value,
        (rt, value: number) => value
    ),

    NUMBER_I32: createValueTypeInfo<number>(
        CatnipValueFormat.I32_NUMBER,
        (rt, value: number) => value,
        (rt, value: number) => value
    ),

    STRING: createValueTypeInfo<string>(
        CatnipValueFormat.I32_HSTRING,
        (rt, value: number) => {
            const bytes = value + CatnipWasmStructHeapString.size;
            const byteLength = CatnipWasmStructHeapString.getMember(value, rt.memory, "bytelen");

            return TEXT_DECODER.decode(rt.memory.buffer.slice(bytes, bytes + byteLength));
        },
        (rt, value: string) => {
            return rt.allocateHeapString(String(value));
        }
    ),

    POINTER: createValueTypeInfo<number>(
        CatnipValueFormat.I32,
        (rt, value: number) => value,
        (rt, value: number) => value
    ),
} satisfies Record<string, CatnipEventValueTypeInfo<any>>;

export type CatnipEventValueType = keyof typeof CatnipEventValueTypes;

export class CatnipEventInfo<TArgs extends readonly CatnipEventValueType[]> {
    public readonly args: TArgs;

    public constructor(args: TArgs) {
        this.args = args;
    }
}

export type CatnipEventID = keyof typeof CatnipEvents;

type CatnipEventListenerArgs<TArgs extends readonly CatnipEventValueType[]> = {
    [K in keyof TArgs]: (typeof CatnipEventValueTypes)[TArgs[K]] extends CatnipEventValueTypeInfo<infer TJavascript> ? TJavascript : never;
}
export type CatnipEventArgs<EventID extends CatnipEventID> = 
    CatnipEventListenerArgs<(typeof CatnipEvents)[EventID] extends CatnipEventInfo<infer Args> ? Args : never>;

export type CatnipEventListener<EventID extends CatnipEventID = CatnipEventID> =
    (...args: CatnipEventArgs<EventID>) => void;

export const CatnipEvents = {
    PROJECT_START: new CatnipEventInfo([] as const),
    PROJECT_BROADCAST: new CatnipEventInfo(["STRING", "POINTER"] as const),

    IO_KEY_PRESSED: new CatnipEventInfo(["NUMBER_I32"] as const), // keyCode
    IO_KEY_RELEASED: new CatnipEventInfo(["NUMBER_I32"] as const), // keyCode
    IO_MOUSE_MOVE: new CatnipEventInfo(["NUMBER", "NUMBER"] as const), // x, y
    IO_MOUSE_DOWN: new CatnipEventInfo([] as const),
    IO_MOUSE_UP: new CatnipEventInfo([] as const),
    
    TARGET_POSITION_UPDATE: new CatnipEventInfo(["NUMBER", "NUMBER"] as const),
} satisfies Record<string, CatnipEventInfo<any>>;
