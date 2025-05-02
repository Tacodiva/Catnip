import { SpiderNumberType, SpiderValueType } from "wasm-spider";
import { CatnipRuntimeModule } from './runtime/CatnipRuntimeModule';
import { CatnipWasmStructHeapString } from "./wasm-interop/CatnipWasmStructHeapString";
import { CatnipValueFormat } from "./compiler/CatnipValueFormat";
import UTF16 from "./utf16";
import { CatnipProject } from "./runtime/CatnipProject";

export interface CatnipEventValueTypeInfo<TJavascript = any> {
    readonly format: CatnipValueFormat;

    decodeWASM(project: CatnipProject, value: any): TJavascript;
    encodeWASM(project: CatnipProject, value: TJavascript): any;
}

function createValueTypeInfo<TJavascript>(
    format: CatnipValueFormat,
    decodeWASM: (project: CatnipProject, value: any) => TJavascript,
    encodeWASM: (project: CatnipProject, value: TJavascript) => any
): CatnipEventValueTypeInfo<TJavascript> {
    return {
        format,
        encodeWASM,
        decodeWASM
    }
}

export const CatnipEventValueTypes = {
    NUMBER: createValueTypeInfo<number>(
        CatnipValueFormat.F64_NUMBER,
        (proj, value: number) => value,
        (proj, value: number) => value
    ),

    NUMBER_I32: createValueTypeInfo<number>(
        CatnipValueFormat.I32_NUMBER,
        (proj, value: number) => value,
        (proj, value: number) => value
    ),

    STRING: createValueTypeInfo<string>(
        CatnipValueFormat.I32_HSTRING,
        (proj, value: number) => {
            const bytes = value + CatnipWasmStructHeapString.size;
            const byteLength = CatnipWasmStructHeapString.getMember(value, proj.runtimeModule.memory, "bytelen") * 2;

            return UTF16.decode(proj.runtimeModule.memory.buffer.slice(bytes, bytes + byteLength));
        },
        (proj, value: string) => {
            return proj.createNewString(String(value));
        }
    ),

    POINTER: createValueTypeInfo<number>(
        CatnipValueFormat.I32,
        (proj, value: number) => value,
        (proj, value: number) => value
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
